import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, DictionaryValue, Sender, SendMode, toNano } from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';
import { StakingPoolConfig } from './StakingPool';
import { AddrList, OpCodes } from './imports/constants';


// export type NftCodesValue = {
//     code: Cell
// }

// function nftCodesValueParser(): DictionaryValue<NftCodesValue> {
//     return {
//         serialize: (src, buidler) => {
//             buidler.storeRef(src.code).endCell();
//         },
//         parse: (src) => {
//             return {farmingSpeed: src.loadCoins(), startTime: src.loadUint(32), endTime: src.loadUint(32)};
//         }
//     }
// }

export type PeriodsDeployValue = {
    tvlLimit: bigint;
    rewardMultiplier: number;
    depositCommission: number;
    unstakeCommission: number;
    jettonContent?: Maybe<Cell>;
}

function periodsDeployValueParser(): DictionaryValue<PeriodsDeployValue> {
    return {
        serialize: (src, buidler) => {
            buidler.storeCoins(src.tvlLimit).storeUint(src.rewardMultiplier, 16).storeUint(src.depositCommission, 16).storeUint(src.unstakeCommission, 16).storeMaybeRef(src.jettonContent).endCell();
        },
        parse: (src) => {
            return {tvlLimit: src.loadCoins(), rewardMultiplier: src.loadUint(16), depositCommission: src.loadUint(16), unstakeCommission: src.loadUint(16), jettonContent: src.loadMaybeRef()};
        }
    }
}

export type PoolFactoryConfig = {
    adminAddress: Address;
    nextPoolId: bigint;
    collectionContent?: Maybe<Cell>;
    minRewardsCommission: bigint;
    unstakeFee: bigint;
    feesWalletAddress?: Address;
    creationFee: bigint;
    poolUninitedCodes: Dictionary<bigint, Cell>;
    poolInitedCode: Cell;
    stakeWalletCode: Cell;
    jettonMinterCode: Cell;
    version: bigint;
};


export function poolFactoryConfigToCell(config: PoolFactoryConfig): Cell {
    return beginCell()
                .storeAddress(config.adminAddress)
                .storeUint(config.nextPoolId, 32)
                .storeMaybeRef(config.collectionContent)
                .storeUint(config.minRewardsCommission, 16)
                .storeCoins(config.unstakeFee)
                .storeAddress(config.feesWalletAddress)
                .storeCoins(config.creationFee)
                .storeRef(
                    beginCell()
                        .storeDict(config.poolUninitedCodes, Dictionary.Keys.BigUint(32), Dictionary.Values.Cell())
                        .storeRef(config.poolInitedCode)
                        .storeRef(config.stakeWalletCode)
                        .storeRef(config.jettonMinterCode)
                        .storeUint(config.version, 16)
                    .endCell()
                )
            .endCell();
}

export class PoolFactory implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new PoolFactory(address);
    }

    static createFromConfig(config: PoolFactoryConfig, code: Cell, workchain = 0) {
        const data = poolFactoryConfigToCell(config);
        const init = { code, data };
        return new PoolFactory(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano("0.05"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSetFeesWallet(provider: ContractProvider, via: Sender, feesWalletAddress: Address) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.TAKE_WALLET_ADDRESS, 32).storeUint(0, 64).storeAddress(feesWalletAddress).endCell(),
        });        
    }

    async sendChangeCreationFee(provider: ContractProvider, via: Sender, newCreationFee: bigint) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.CHANGE_CREATION_FEE, 32).storeUint(0, 64).storeCoins(newCreationFee).endCell(),
        });        
    }

    async sendChangeCodes(provider: ContractProvider, via: Sender, stakingPoolCode: Cell, stakeWalletCode: Cell, jettonMinterCode: Cell) {
        await provider.internal(via, {
            value: toNano("0.01"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.UPDATE_CODES, 32).storeUint(0, 64).storeRef(stakingPoolCode).storeRef(stakeWalletCode).storeRef(jettonMinterCode).endCell()
        })
    }

    async sendSetCode(provider: ContractProvider, via: Sender, factoryCode: Cell, factoryData: Maybe<Cell>) {
        await provider.internal(via, {
            value: toNano("0.02"),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(OpCodes.SET_CODE, 32).storeUint(0, 64).storeRef(factoryCode).storeMaybeRef(factoryData).endCell()
        })
    }

    static getDeployPayload(lockWalletAddress: Address,
                             minDeposit: bigint | number, 
                             maxDeposit: bigint | number,
                             lockPeriods: Dictionary<number, PeriodsDeployValue>,
                             whitelist: Maybe<AddrList>,
                             rewardsCommission: bigint | number,
                             nftContent?: Maybe<Cell>
                        ) {
        return beginCell()
                    .storeUint(OpCodes.DEPLOY_NEW_POOL, 32)
                    .storeAddress(lockWalletAddress)
                    .storeCoins(minDeposit)
                    .storeCoins(maxDeposit)
                    .storeDict(lockPeriods, Dictionary.Keys.Uint(32), periodsDeployValueParser())
                    .storeDict(whitelist, Dictionary.Keys.Address(), Dictionary.Values.Bool())
                    .storeUint(rewardsCommission, 16)
                    .storeMaybeRef(nftContent)
                .endCell();
    }

    async getStorageData(provider: ContractProvider): Promise<PoolFactoryConfig> {
        let { stack } = await provider.get('get_storage_data', []);

        return { 
            adminAddress: stack.readAddress(),
            nextPoolId: stack.readBigNumber(),
            collectionContent: stack.readCellOpt(),
            minRewardsCommission: stack.readBigNumber(),
            unstakeFee: stack.readBigNumber(),
            feesWalletAddress: stack.readAddress(),
            creationFee: stack.readBigNumber(),
            poolUninitedCodes: stack.readCell().beginParse().loadDictDirect(Dictionary.Keys.BigUint(32), Dictionary.Values.Cell()),
            poolInitedCode: stack.readCell(),
            stakeWalletCode: stack.readCell(),
            jettonMinterCode: stack.readCell(),
            version: stack.readBigNumber()
        }
    }

    async getNftAddressByIndex(provider: ContractProvider, index: number | bigint) {
        let { stack } = await provider.get('get_nft_address_by_index', [{ type: 'int', value: BigInt(index)} ]);
        return stack.readAddress();
    }
}
