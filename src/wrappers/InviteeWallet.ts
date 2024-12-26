import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode } from '@ton/core';

export type InviteeWalletConfig = {
    ownerAddress?: Address;
    referrerWalletAddress?: Address;
    balances?: Dictionary<number, bigint>;
    init: boolean;
};

export function invateeWalletConfigToCell(config: InviteeWalletConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeAddress(config.referrerWalletAddress)
        .storeDict(config.balances, Dictionary.Keys.Uint(32), Dictionary.Values.BigVarUint(4))
    .endCell();
}

export class InviteeWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new InviteeWallet(address);
    }

    static createFromConfig(ownerAddress: Address, code: Cell, workchain = 0) {
        const data = beginCell().storeAddress(ownerAddress).endCell();
        const init = { code, data };
        return new InviteeWallet(contractAddress(workchain, init), init);
    }


    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getStorageData(provider: ContractProvider): Promise<InviteeWalletConfig> {
        const {stack} = await provider.get('get_storage_data', []);
        return {
            init: stack.readBoolean(),
            ownerAddress: stack.readAddressOpt() ?? undefined,
            referrerWalletAddress: stack.readAddressOpt() ?? undefined,
            balances: beginCell().storeMaybeRef(stack.readCellOpt()).asSlice().loadDict(Dictionary.Keys.Uint(32), Dictionary.Values.BigVarUint(4))
        };
    }
}