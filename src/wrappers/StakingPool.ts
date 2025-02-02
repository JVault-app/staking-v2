import { Address, beginCell, Builder, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, Slice, toNano, TupleBuilder, TupleItemInt } from '@ton/core';
import { AddrList, Gas, OpCodes } from './imports/constants';
import { UserRewardsDictValue, userRewardsDictValueParser } from './StakeWallet';
import { Maybe } from '@ton/core/dist/utils/maybe';


export type LockPeriodsValue = {
    curTvl: bigint
    tvlLimit: bigint
    rewardMultiplier: number
    depositCommission: number
    unstakeCommission: number
    minterAddress: Address
};

function lockPeriodsValueParser(): DictionaryValue<LockPeriodsValue> {
    return {
        serialize: (src, buidler) => {
            buidler
                .storeCoins(src.curTvl)
                .storeCoins(src.tvlLimit)
                .storeUint(src.rewardMultiplier, 16)
                .storeUint(src.depositCommission, 16)
                .storeUint(src.unstakeCommission, 16)
                .storeAddress(src.minterAddress)
            .endCell();
        },
        parse: (src) => {
            return {curTvl: src.loadCoins(), 
                    tvlLimit: src.loadCoins(), 
                    rewardMultiplier: src.loadUint(16),
                    depositCommission: src.loadUint(16),
                    unstakeCommission: src.loadUint(16), 
                    minterAddress: src.loadAddress()};
        }
    }
}

export type RewardsDepositsValue = {
    distributionSpeed: bigint
    startTime: number
    endTime: number
}

function rewardsDepositsValueParser(): DictionaryValue<RewardsDepositsValue> {
    return {
        serialize: (src, buidler) => {
            buidler.storeCoins(src.distributionSpeed).storeUint(src.startTime, 32).storeUint(src.endTime, 32).endCell();
        },
        parse: (src) => {
            return {distributionSpeed: src.loadCoins(), startTime: src.loadUint(32), endTime: src.loadUint(32)};
        }
    }
}

export type RewardJettonsValue = {
    distributedRewards: bigint
    rewardsDeposits: Dictionary<number, RewardsDepositsValue>
}

function rewardJettonsValueParser(): DictionaryValue<RewardJettonsValue> {
    return {
        serialize: (src, buidler) => {
            buidler.storeUint(src.distributedRewards, 256).storeDict(src.rewardsDeposits, Dictionary.Keys.Uint(32), rewardsDepositsValueParser()).endCell();
        },
        parse: (src) => {
            return {distributedRewards: src.loadUintBig(256), rewardsDeposits: src.loadDict(Dictionary.Keys.Uint(32), rewardsDepositsValueParser())};
        }
    }
}

export type StakingPoolConfig = {
    inited: boolean;
    content?: Cell;
    poolId: bigint;
    factoryAddress: Address;
    adminAddress: Address;
    creatorAddress: Address;
    stakeWalletCode: Cell;
    lockWalletAddress: Address;
    minDeposit: bigint;
    maxDeposit: bigint;
    tvl: bigint;
    tvlWithMultipliers: bigint;
    rewardJettons: Dictionary<Address, RewardJettonsValue> | null;
    rewardJettonsCount?: bigint;
    rewardsDepositsCount?: bigint;
    lockPeriods: Dictionary<number, LockPeriodsValue>;
    whitelist: AddrList | null;
    unstakeFee: bigint;
    collectedCommissions: bigint;
    rewardsCommission: bigint;
    version?: bigint;
};

export type StakingPoolUninitedConfig = {
    poolId: bigint;
    factoryAddress: Address;
}

export function stakingPoolConfigToCell(config: StakingPoolUninitedConfig | StakingPoolConfig): Cell {
    return beginCell().storeAddress(config.factoryAddress).storeUint(config.poolId, 32).endCell();
}

export function stakingPoolInitedData(config: StakingPoolConfig): Cell {
    return beginCell()
                .storeBit(config.inited)
                .storeUint(config.poolId, 32)
                .storeAddress(config.adminAddress)
                .storeAddress(config.creatorAddress)
                .storeAddress(config.lockWalletAddress)
                .storeMaybeRef(config.content)
                .storeRef(config.stakeWalletCode)
                .storeRef(
                    beginCell()
                        .storeCoins(config.tvl)
                        .storeCoins(config.tvlWithMultipliers)
                        .storeCoins(config.minDeposit)
                        .storeCoins(config.maxDeposit)
                        .storeDict(config.rewardJettons, Dictionary.Keys.Address(), rewardJettonsValueParser())
                        .storeUint(config.rewardJettonsCount ?? 0, 8)
                        .storeUint(config.rewardsDepositsCount ?? 0, 8)
                        .storeDict(config.lockPeriods, Dictionary.Keys.Uint(32), lockPeriodsValueParser())
                        .storeDict(config.whitelist, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                        .storeCoins(config.unstakeFee)
                        .storeCoins(config.collectedCommissions)
                        .storeUint(config.rewardsCommission, 16)
                        .storeUint(config.version ?? 0, 16)
                    .endCell()
                )
            .endCell();
}

export class StakingPool implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new StakingPool(address);
    }

    static createFromConfig(config: StakingPoolUninitedConfig | StakingPoolConfig, code: Cell, workchain = 0) {
        const data = stakingPoolConfigToCell(config);
        const init = { code, data };
        return new StakingPool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, poolInitedConfig: StakingPoolConfig, poolInitedCode: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeAddress(poolInitedConfig.lockWalletAddress).storeRef(stakingPoolInitedData(poolInitedConfig)).storeRef(poolInitedCode).endCell(),
        });
    }
    
    async sendSetLockWallet(provider: ContractProvider, via: Sender, lockWalletAddress: Address, queryId: number = 0) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.TAKE_WALLET_ADDRESS, 32).storeUint(queryId, 64).storeAddress(lockWalletAddress).endCell(),
        });
    }
    static stakePayload(lockPeriod: number | bigint, referrerAddress?: Address): Cell {
        return beginCell()
                .storeUint(OpCodes.STAKE_JETTONS, 32)
                .storeUint(lockPeriod, 32)
                .storeMaybeRef(referrerAddress ? beginCell().storeAddress(referrerAddress).endCell() : null)
            .endCell();
    }

    static addRewardsPayload(startTime: number | bigint, endTime: number | bigint): Cell {
        return beginCell().storeUint(OpCodes.ADD_REWARDS, 32).storeUint(startTime, 32).storeUint(endTime, 32).endCell();
    }

    async sendAddRewardJettons(provider: ContractProvider, via: Sender, jettonWallets: AddrList, queryId?: number) {
        await provider.internal(via, {
            value: toNano("0.05"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(OpCodes.ADD_REWARD_JETTONS, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeDict(jettonWallets, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                .endCell(),
        }); 
    }

    async sendClaimCommissions(provider: ContractProvider, via: Sender, queryId?: number) {
        await provider.internal(via, {
            value: Gas.JETTON_TRANSFER + toNano('0.02'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.CLAIM_COMMISSIONS, 32).storeUint(queryId ?? 0, 64).endCell()
        });
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

    static cancelStakeMessage(jettonsToReturn: bigint, queryId?: number) {
        return beginCell().storeUint(OpCodes.CANCEL_STAKE, 32).storeUint(queryId ?? 0, 64).storeCoins(jettonsToReturn).endCell()
    }

    static requestUpdateRewardsMessage(ownerAddress: Address,
                                        lockPeriod: number,
                                        userJettonBalance: bigint, 
                                        tvlChange: bigint, 
                                        userRewardsDict: Dictionary<Address, UserRewardsDictValue>,
                                        jettonsToSend?: bigint,
                                        commission?: bigint,
                                        forwardAddress?: Address,
                                        queryId?: number): Cell {
        let res = beginCell()
                        .storeUint(OpCodes.REQUEST_UPDATE_REWARDS, 32)
                        .storeUint(queryId ?? 0, 64)
                        .storeAddress(ownerAddress)
                        .storeUint(lockPeriod, 32)
                        .storeCoins(userJettonBalance)
                        .storeInt(tvlChange, 121)
                        .storeDict(userRewardsDict, Dictionary.Keys.Address(), userRewardsDictValueParser())
                        .storeCoins(jettonsToSend ?? 0)
                        .storeCoins(commission ?? 0);
        if (forwardAddress) {
            res = res.storeAddress(forwardAddress)
        }
        return res.endCell()
    }

    static requestSendClaimedRewardsMessage(userJettonBalance: bigint, 
                                            userRewardsDict: Dictionary<Address, UserRewardsDictValue>,
                                            jettonsToClaim: AddrList,
                                            ownerAddress: Address,
                                            lockPeriod: number,
                                            queryId?: number): Cell {
        return beginCell()
                    .storeUint(OpCodes.REQUEST_UPDATE_REWARDS, 32)
                    .storeUint(queryId ?? 0, 64)
                    .storeAddress(ownerAddress)
                    .storeUint(lockPeriod, 32)
                    .storeCoins(userJettonBalance)
                    .storeDict(userRewardsDict, Dictionary.Keys.Address(), userRewardsDictValueParser())
                    .storeDict(jettonsToClaim, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                .endCell();
    }

    async getData(provider: ContractProvider) {
        let { stack } = await provider.get('get_nft_data', []);
        return {
            init: stack.readBoolean(),
            index: stack.readBigNumber(),
            collection: stack.readAddressOpt(),
            owner: stack.readAddressOpt(),
            content: stack.readCell()
        }
    }

    async getStorageData(provider: ContractProvider): Promise<StakingPoolConfig> {
        let { stack } = await provider.get('get_storage_data', []);
        let res: any = {
            inited: stack.readBoolean(),
            poolId: stack.readBigNumber(),
            adminAddress: stack.readAddress(),
            creatorAddress: stack.readAddress(),
            stakeWalletCode: stack.readCell(),
            lockWalletAddress: stack.readAddress(),
            tvl: stack.readBigNumber(),
            tvlWithMultipliers: stack.readBigNumber(),
            minDeposit: stack.readBigNumber(),
            maxDeposit: stack.readBigNumber(),
            rewardJettons: stack.readCellOpt(),
            rewardJettonsCount: stack.readBigNumber(),
            rewardsDepositsCount: stack.readBigNumber(),
            lockPeriods: stack.readCellOpt(),
            whitelist: stack.readCellOpt(),
            unstakeFee: stack.readBigNumber(),
            collectedCommissions: stack.readBigNumber(),
            rewardsCommission: stack.readBigNumber(),
            version: stack.readBigNumber(),
        }
        
        if (res.rewardJettons) {
            res.rewardJettons = res.rewardJettons.beginParse().loadDictDirect(Dictionary.Keys.Address(), rewardJettonsValueParser());
        }
        if (res.lockPeriods) {
            res.lockPeriods = res.lockPeriods.beginParse().loadDictDirect(Dictionary.Keys.Uint(32), lockPeriodsValueParser());
        }
        if (res.whitelist) {
            res.whitelist = res.whitelist.beginParse().loadDictDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool());
        }
        let k: StakingPoolConfig = res;
        return k;
    }

    async getWalletAddress(provider: ContractProvider, ownerAddress: Address, lockPeriod: number): Promise<Maybe<Address>> {
        let { stack } = await provider.get('get_stake_wallet_address', [{ type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() }, { type: 'int', value: BigInt(lockPeriod) }]);
        return stack.readAddressOpt();
    }
}
