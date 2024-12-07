import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type StakingPoolUninitedConfig = {
    factoryAddress: Address,
    poolId: number,
};

export function stakingPoolUninitedConfigToCell(config: StakingPoolUninitedConfig): Cell {
    return beginCell()
            .storeAddress(config.factoryAddress)
            .storeUint(config.poolId, 32)
        .endCell();
}

export class StakingPoolUninited implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new StakingPoolUninited(address);
    }

    static createFromConfig(config: StakingPoolUninitedConfig, code: Cell, workchain = 0) {
        const data = stakingPoolUninitedConfigToCell(config);
        const init = { code, data };
        return new StakingPoolUninited(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, lockJettonMinter: Address, data: Cell, code: Cell) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeAddress(lockJettonMinter)
                    .storeRef(data)
                    .storeRef(code)
                .endCell(),
        });
    }
}
