import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode, Slice } from '@ton/core';
import { OpCodes } from './imports/constants';

export type StakingPoolConfig = {
    poolId: bigint;
    factoryAddress: Address;
    adminAddress: Address;
    creatorAddress: Address;
    jettonContent: Cell;
    stakeWalletCode: Cell;
    lockWalletAddress: Address;
    minDeposit: bigint;
    maxDeposit: bigint;
    tvl: bigint;
    tvlWithMultipliers: bigint;
    rewardJettons: Dictionary<number, Slice>;
    lockPeriods: Dictionary<number, Slice>;
    whitelist: Dictionary<Address, null>;
    unstakeCommission: bigint;
    unstakeFee: bigint;
    collectedCommissions: bigint;
    rewardsCommission: bigint;
};

export function stakingPoolConfigToCell(config: StakingPoolConfig): Cell {
    return beginCell().storeAddress(config.factoryAddress).storeUint(config.poolId, 32).endCell();
}

export function stakingPooDeployBody(config: StakingPoolConfig): Cell {
    return beginCell()
                .storeUint(config.poolId, 32)
                .storeAddress(config.adminAddress)
                .storeAddress(config.creatorAddress)
                .storeMaybeRef(config.jettonContent)
                .storeRef(config.stakeWalletCode)
                .storeAddress(config.lockWalletAddress)
                .storeRef(
                    beginCell()
                        .storeCoins(config.minDeposit)
                        .storeCoins(config.maxDeposit)
                        .storeCoins(config.tvl)
                        .storeCoins(config.tvlWithMultipliers)
                        .storeDict(config.rewardJettons)
                        .storeDict(config.lockPeriods)
                        .storeDict(config.whitelist)
                        .storeUint(config.unstakeCommission, 32)
                        .storeCoins(config.unstakeFee)
                        .storeCoins(config.collectedCommissions)
                        .storeUint(config.rewardsCommission, 16)
                    .endCell()
                )
            .endCell();
}

export class StakingPool implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new StakingPool(address);
    }

    static createFromConfig(config: StakingPoolConfig, code: Cell, workchain = 0) {
        const data = stakingPoolConfigToCell(config);
        const init = { code, data };
        return new StakingPool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, config: StakingPoolConfig) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: stakingPooDeployBody(config),
        });
    }

    static stakePayload(lockPeriod: number | bigint): Cell {
        return beginCell().storeUint(OpCodes.STAKE_JETTONS, 32).storeUint(lockPeriod, 32).endCell();
    }

    static addRewardsPayload(startTime: number | bigint, endTime: number | bigint): Cell {
        return beginCell().storeUint(OpCodes.ADD_REWARDS, 32).storeUint(startTime, 32).storeUint(endTime, 32).endCell();
    }

    async getStorageData(provider: ContractProvider) {
        let { stack } = await provider.get('get_storage_data', []);

        return {
            poolId: stack.readBigNumber(),
            adminAddress: stack.readAddress(),
            creatorAddress: stack.readAddress(),
            stakeWalletCode: stack.readCell(),
            lockWalletAddress: stack.readAddress(),
            minDeposit: stack.readBigNumber(),
            maxDeposit: stack.readBigNumber(),
            tvl: stack.readBigNumber(),
            tvlWithMultipliers: stack.readBigNumber(),
            rewardJettons: stack.readCell(),
            lockPeriods: stack.readCell(),
            whitelist: stack.readCell(),
            unstakeCommission: stack.readBigNumber(),
            unstakeFee: stack.readBigNumber(),
            collectedCommissions: stack.readBigNumber(),
            rewardsCommission: stack.readBigNumber()
        }
    }
}
