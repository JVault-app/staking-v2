import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, toNano } from '@ton/core';
import { AddrList, Dividers, Gas, OpCodes } from './imports/constants';
import { Maybe } from '@ton/core/dist/utils/maybe';
import { StakingPool, StakingPoolConfig } from './StakingPool';


export type UserRewardsDictValue = {
    distributedRewards: bigint
    unclaimedRewards: bigint 
}

export function userRewardsDictValueParser(): DictionaryValue<UserRewardsDictValue> {
    return {
        serialize: (src, buidler) => {
            buidler.storeUint(src.distributedRewards, 256).storeCoins(src.unclaimedRewards).endCell();
        },
        parse: (src) => {
            return {distributedRewards: src.loadUintBig(256), unclaimedRewards: src.loadCoins()};
        }
    }
}

export type StakeWalletConfig = {
    stakingPoolAddress: Address;
    ownerAddress: Address;
    minterAddress: Address;
    lockPeriod: bigint;
    jettonBalance: bigint;
    rewardsDict: Dictionary<Address, UserRewardsDictValue>;
    unstakeRequests: Dictionary<number, bigint>;
    requestsCount: bigint;
    totalRequestedJettons: bigint;
    isActive: boolean;
    unstakeCommission: bigint;
    unstakeFee: bigint;
    minDeposit: bigint;
    maxDeposit: bigint;
    whitelist: Dictionary<Address, boolean>;
};

export type StakeWalletUninitedConfig = {
    stakingPoolAddress: Address;
    ownerAddress: Address;
    minterAddress: Address;
    lockPeriod: bigint;
}

export function stakeWalletConfigToCell(config: StakeWalletUninitedConfig | StakeWalletConfig): Cell {
    return beginCell()
            .storeAddress(config.stakingPoolAddress)
            .storeAddress(config.minterAddress)
            .storeAddress(config.ownerAddress)
            .storeRef(
                beginCell()
                    .storeUint(config.lockPeriod, 32)
                    .storeUint(1, 19)
                .endCell()
            )
        .endCell();
}


export class StakeWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new StakeWallet(address);
    }

    static createFromConfig(config: StakeWalletUninitedConfig | StakeWalletConfig, code: Cell, workchain = 0) {
        const data = stakeWalletConfigToCell(config);
        const init = { code, data };
        return new StakeWallet(contractAddress(workchain, init), init);
    }

    static receiveStakedJettonsMessage(config: StakeWalletConfig, receivedJettons: bigint, queryId?: number) {
        return beginCell()
                    .storeUint(OpCodes.RECEIVE_JETTONS, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeCoins(config.minDeposit)
                    .storeCoins(config.maxDeposit)
                    .storeUint(config.unstakeCommission, 16)
                    .storeCoins(config.unstakeFee)
                    .storeDict(config.whitelist, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                    .storeCoins(receivedJettons)
                .endCell();
    }

    static receiveTransferredJettonsMessage(config: StakeWalletConfig,
                                            receivedJettons: bigint, 
                                            senderAddress: Address, 
                                            senderBalance: bigint, 
                                            senderRewards: Dictionary<Address, UserRewardsDictValue>,
                                            forwardAmount: bigint,
                                            forwardPayload: Maybe<Cell>,
                                            responseAddress?: Address,
                                            queryId?: number) {
        return beginCell()
                    .storeUint(OpCodes.RECEIVE_JETTONS, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeCoins(config.minDeposit)
                    .storeCoins(config.maxDeposit)
                    .storeUint(config.unstakeFee, 32)
                    .storeDict(config.whitelist, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                    .storeCoins(receivedJettons)
                    .storeAddress(senderAddress)
                    .storeRef(
                        beginCell()
                            .storeAddress(responseAddress ?? senderAddress)
                            .storeCoins(forwardAmount)
                            .storeCoins(senderBalance)
                            .storeDict(senderRewards, Dictionary.Keys.Address(), userRewardsDictValueParser())
                            .storeMaybeRef(forwardPayload)
                        .endCell()
                    )
                .endCell();
    }
    
    static cancelStakeMessage(jettonsToReturn: bigint, queryId?: number) {
        return beginCell().storeUint(OpCodes.CANCEL_STAKE, 32).storeUint(queryId ?? 0, 64).storeCoins(jettonsToReturn).endCell()
    }

    static updateRewardsMessage(userRewardsDict: Dictionary<Address, UserRewardsDictValue>, queryId?: number): Cell {
        return beginCell()
                .storeUint(OpCodes.UPDATE_REWARDS, 32)
                .storeUint(queryId ?? 0, 64)
                .storeDict(userRewardsDict, Dictionary.Keys.Address(), userRewardsDictValueParser())
            .endCell()
    }

    async sendGetStorageData(provider: ContractProvider, via: Sender, value: bigint, toAddress: Address, forwardPayload: Maybe<Cell>, queryId?: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(OpCodes.GET_STORAGE_DATA, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeAddress(toAddress)
                    .storeMaybeRef(forwardPayload)
                .endCell()
        });
    }
    
    async sendClaimRewards(provider: ContractProvider, via: Sender, rewardsToClaim: AddrList, queryId?: number) {
        const requiredGas = BigInt(rewardsToClaim.size) * Gas.JETTON_TRANSFER + Gas.SIMPLE_UPDATE_REQUEST;
        await provider.internal(via, {
            value: requiredGas,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                        .storeUint(OpCodes.CLAIM_REWARDS, 32)
                        .storeUint(queryId ?? 0, 64)
                        .storeDict(rewardsToClaim, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                .endCell()
        });
    }

    async sendUnstakeRequest(provider: ContractProvider, via: Sender, jettonsToUnstake: bigint, queryId?: number) {
        await provider.internal(via, {
            value: Gas.UNSTAKE_JETTONS,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                        .storeUint(OpCodes.UNSTAKE_REQUEST, 32)
                        .storeUint(queryId ?? 0, 64)
                        .storeCoins(jettonsToUnstake)
                .endCell()
        });
    }

    async sendUnstakeJettons(provider: ContractProvider, via: Sender, jettonsToUnstake: bigint, forceUnstake?: boolean, unstakeFee?: bigint, queryId?: number) {
        const requiredGas = unstakeFee ? Gas.UNSTAKE_JETTONS + unstakeFee : Gas.UNSTAKE_JETTONS
        await provider.internal(via, {
            value: requiredGas,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                        .storeUint(OpCodes.UNSTAKE_JETTONS, 32)
                        .storeUint(queryId ?? 0, 64)
                        .storeCoins(jettonsToUnstake)
                        .storeBit(forceUnstake ?? false)
                .endCell()
        });
    }

    async sendCancelUnstakeRequest(provider: ContractProvider, via: Sender, requestsToCancel: Dictionary<number, boolean>, queryId?: number) {
        await provider.internal(via, {
            value: Gas.CANCEL_UNSTAKE,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                        .storeUint(OpCodes.CANCEL_UNSTAKE_REQUEST, 32)
                        .storeUint(queryId ?? 0, 64)
                        .storeDict(requestsToCancel, Dictionary.Keys.Uint(32), Dictionary.Values.Bool())
                .endCell()
        });
    }

    static transferMessage(jetton_amount: bigint, 
                           toAddress: Address,
                           responseAddress: Address,
                           forwardTonAmount: bigint,
                           forwardPayload: Maybe<Cell>,
                           queryId?: number) {
        return beginCell()
                    .storeUint(OpCodes.TRANSFER_JETTON, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeCoins(jetton_amount)
                    .storeAddress(toAddress)
                    .storeAddress(responseAddress)
                    .storeBit(0)
                    .storeCoins(forwardTonAmount)
                    .storeMaybeRef(forwardPayload)
                .endCell();
    }
    
    async sendTransfer(provider: ContractProvider,
                        via: Sender,
                        jettonAmount: bigint, 
                        toAddress: Address,
                        responseAddress:Address,
                        forwardTonAmount: bigint,
                        forwardPayload?: Maybe<Cell>) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: StakeWallet.transferMessage(jettonAmount, toAddress, responseAddress, forwardTonAmount, forwardPayload),
            value: Gas.SEND_STAKED_JETTONS + forwardTonAmount
        });
    }

    static getAvailableRewards(stakeWalletConfig: StakeWalletConfig, poolConfig: StakingPoolConfig) {
        if (!poolConfig.rewardJettons) {
            return {}
        }

        const timeNow = Math.floor(Date.now() / 1000);
        const rewardMultiplier = poolConfig.lockPeriods.get(Number(stakeWalletConfig.lockPeriod))!!.rewardMultiplier;

        let res: {[key: string]: bigint} = {};
        for (const rewardJettonWallet of poolConfig.rewardJettons!!.keys()) {
            const poolRewardsInfo = poolConfig.rewardJettons.get(rewardJettonWallet)!!;
            const userRewardsInfo = stakeWalletConfig.rewardsDict.get(rewardJettonWallet);
            let unclaimedRewards = userRewardsInfo ? userRewardsInfo.unclaimedRewards : 0n;
            const userDistributedRewards = userRewardsInfo ? userRewardsInfo.distributedRewards : 0n;
            let poolDistributedRewards = poolRewardsInfo.distributedRewards;
            for (let i of poolRewardsInfo.rewardsDeposits.keys()) {
                const rewardDeposit = poolRewardsInfo.rewardsDeposits.get(i)!!;
                if (rewardDeposit.startTime < timeNow && poolConfig.tvlWithMultipliers) {
                    poolDistributedRewards += rewardDeposit.distributionSpeed * BigInt(Math.min(timeNow, rewardDeposit.endTime) - rewardDeposit.startTime) * Dividers.DISTRIBUTED_REWARDS_DIVIDER / (Dividers.DISTRIBUTION_SPEED_DIVIDER * poolConfig.tvlWithMultipliers);
                }
            }
            unclaimedRewards += (poolDistributedRewards - userDistributedRewards) * stakeWalletConfig.jettonBalance * BigInt(rewardMultiplier) / (Dividers.DISTRIBUTED_REWARDS_DIVIDER * BigInt(Dividers.REWARDS_DIVIDER));
            res[rewardJettonWallet.toString()] = unclaimedRewards;
        }
        return res;
    }

    async getStorageData(provider: ContractProvider): Promise<StakeWalletConfig> {
        let { stack } = await provider.get('get_storage_data', []);

        let res: any = { 
            stakingPoolAddress: stack.readAddress(),
            ownerAddress: stack.readAddress(),
            lockPeriod: stack.readBigNumber(),
            jettonBalance: stack.readBigNumber(),
            rewardsDict: stack.readCellOpt(),
            unstakeRequests: stack.readCellOpt(),
            requestsCount: stack.readBigNumber(),
            totalRequestedJettons: stack.readBigNumber(),
            isActive: Boolean(stack.readNumber()),
            unstakeCommission: stack.readBigNumber(),
            unstakeFee: stack.readBigNumber(),
            minDeposit: stack.readBigNumber(),
            maxDeposit: stack.readBigNumber(),
            whitelist: stack.readCellOpt(),
            minterAddress: stack.readAddress()
        }
        
        if (res.rewardsDict) {
            res.rewardsDict = res.rewardsDict.beginParse().loadDictDirect(Dictionary.Keys.Address(), userRewardsDictValueParser());  
        }
        if (res.unstakeRequests) {
            res.unstakeRequests = res.unstakeRequests.beginParse().loadDictDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigVarUint(4));
        }
        if (res.whitelist) {
            res.whitelist = res.whitelist.beginParse().loadDictDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool());
        }
        let k: StakeWalletConfig = res;
        return k;
    }

    async getRewardsDict(provider: ContractProvider): Promise<Cell> {
        let { stack } = await provider.get('get_storage_data', []);

        let res: any = { 
            stakingPoolAddress: stack.readAddress(),
            ownerAddress: stack.readAddress(),
            lockPeriod: stack.readBigNumber(),
            jettonBalance: stack.readBigNumber(),
            rewardsDict: stack.readCellOpt(),
            unstakeRequests: stack.readCellOpt(),
            requestsCount: stack.readBigNumber(),
            totalRequestedJettons: stack.readBigNumber(),
            isActive: stack.readBoolean(),
            unstakeCommission: stack.readBigNumber(),
            unstakeFee: stack.readBigNumber(),
            minDeposit: stack.readBigNumber(),
            maxDeposit: stack.readBigNumber(),
            whitelist: stack.readCellOpt(),
            minterAddress: stack.readAddress()
        }
        return res.rewardsDict;
    }
}
