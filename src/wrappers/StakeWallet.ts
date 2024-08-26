import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, toNano } from '@ton/core';
import { AddrList, Gas, OpCodes } from './imports/constants';
import { Maybe } from '@ton/core/dist/utils/maybe';
import { StakingPool } from './StakingPool';


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

export function stakeWalletInitData(config: StakeWalletConfig, walletCode?: Cell): Cell {
    return beginCell()
            .storeAddress(config.stakingPoolAddress)
            .storeAddress(config.minterAddress)
            .storeAddress(config.ownerAddress)
            .storeRef(
                beginCell()
                    .storeUint(config.lockPeriod, 32)
                    .storeCoins(config.jettonBalance)
                    .storeDict(config.rewardsDict, Dictionary.Keys.Address(), userRewardsDictValueParser())
                    .storeDict(config.unstakeRequests, Dictionary.Keys.Uint(32), Dictionary.Values.BigVarUint(16))
                    .storeUint(config.requestsCount, 8)
                    .storeCoins(config.totalRequestedJettons)
                    .storeBit(config.isActive)
                    .storeUint(config.unstakeCommission, 16)
                    .storeCoins(config.unstakeFee)
                    .storeCoins(config.minDeposit)
                    .storeCoins(config.maxDeposit)
                    .storeDict(config.whitelist, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                    .storeBuilder(walletCode ? beginCell().storeMaybeRef(walletCode) : beginCell())
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
            isActive: stack.readBoolean(),
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
            res.unstakeRequests = res.unstakeRequests.beginParse().loadDictDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigVarUint(16));
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
