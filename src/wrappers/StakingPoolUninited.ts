import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type StakingPoolUninitedConfig = {};

export function stakingPoolUninitedConfigToCell(config: StakingPoolUninitedConfig): Cell {
    return beginCell().endCell();
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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
