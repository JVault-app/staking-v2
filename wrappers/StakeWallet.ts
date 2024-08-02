import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type StakeWalletConfig = {};

export function stakeWalletConfigToCell(config: StakeWalletConfig): Cell {
    return beginCell().endCell();
}

export class StakeWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new StakeWallet(address);
    }

    static createFromConfig(config: StakeWalletConfig, code: Cell, workchain = 0) {
        const data = stakeWalletConfigToCell(config);
        const init = { code, data };
        return new StakeWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
