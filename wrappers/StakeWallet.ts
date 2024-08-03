import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type StakeWalletConfig = {
    stakingPoolAddress: Address;
    ownerAddress: Address;
    minterAddress: Address;
    lockPeriod: bigint;
    jettonBalance: bigint;
    rewardsDict: Cell;
    unstakeRequests: Cell;
    totalRequestedJettons: bigint;
    isActive: boolean;
    unstakeCommission: bigint;
    unstakeFee: bigint;
    minDeposit: bigint;
    maxDeposit: bigint;
    whitelist: Cell;
};

export function stakeWalletConfigToCell(config: StakeWalletConfig): Cell {
    return beginCell()
            .storeAddress(config.stakingPoolAddress)
            .storeAddress(config.ownerAddress)
            .storeAddress(config.minterAddress)
            .storeRef(
                beginCell()
                    .storeUint(config.lockPeriod, 32)
                    .storeUint(1, 11)
                .endCell()
            )
        .endCell();
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

    async getStorageData(provider: ContractProvider) {
        let { stack } = await provider.get('get_storage_data', []);

        return { 
            stakingPoolAddress: stack.readAddress(),
            ownerAddress: stack.readAddress(),
            lockPeriod: stack.readBigNumber(),
            jettonBalance: stack.readBigNumber(),
            rewardsDict: stack.readCell(),
            unstakeRequests: stack.readCell(),
            totalRequestedJettons: stack.readBigNumber(),
            isActive: stack.readBoolean(),
            unstakeCommission: stack.readBigNumber(),
            unstakeFee: stack.readBigNumber(),
            minDeposit: stack.readBigNumber(),
            maxDeposit: stack.readBigNumber(),
            whitelist: stack.readCell(),
            minterAddress: stack.readAddress()
        }
    }
}
