import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type StakedJettonWalletConfig = {};

export function stakedJettonWalletConfigToCell(config: StakedJettonWalletConfig): Cell {
    return beginCell().endCell();
}

export class StakedJettonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new StakedJettonWallet(address);
    }

    static createFromConfig(config: StakedJettonWalletConfig, code: Cell, workchain = 0) {
        const data = stakedJettonWalletConfigToCell(config);
        const init = { code, data };
        return new StakedJettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
