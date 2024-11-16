import { Address, beginCell, Cell, Dictionary, StateInit, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig, poolFactoryConfigToCell } from '../wrappers/PoolFactory';
import { compile, NetworkProvider, sleep } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';
import { getAddressByStateInit, packStateInit } from '../wrappers/imports/functions';


export async function run(provider: NetworkProvider) {
    let poolUninitedCodes: Dictionary<bigint, Cell> = Dictionary.empty();
    poolUninitedCodes.set(0n, await compile("StakingPoolUninited"));

    let factoryConfig: PoolFactoryConfig = {
        adminAddress: Address.parse("UQDtZ91HL9fRGJlGyceT2OEVLXfH3qCAaVUgRA6nz5ZuZUlr"),
        ownerAddress: Address.parse("UQDtZ91HL9fRGJlGyceT2OEVLXfH3qCAaVUgRA6nz5ZuZUlr"),
        nextPoolId: 0n,
        collectionContent: Cell.EMPTY,
        minRewardsCommission: BigInt(0.005 * Number(Dividers.COMMISSION_DIVIDER)),  // 0.5%
        unstakeFee: toNano("0.3"),
        feesWalletAddress: Address.parse("EQBLiQQUxD_Vx4rew-pJDRBt4OVvxcyKnc_OKSJmdi22G1vz"),
        creationFee: toNano("50"),
        poolUninitedCodes: poolUninitedCodes,
        poolInitedCode: Cell.EMPTY,
        stakeWalletCode: Cell.EMPTY,
        jettonMinterCode: Cell.EMPTY,
        version: 0n 
    }

    let data = beginCell()
            .storeAddress(factoryConfig.ownerAddress)
            .storeUint(factoryConfig.nextPoolId, 32)
            .storeMaybeRef(factoryConfig.collectionContent)
            .storeUint(factoryConfig.minRewardsCommission, 16)
            .storeCoins(factoryConfig.unstakeFee)
            .storeAddress(factoryConfig.feesWalletAddress)
            .storeCoins(factoryConfig.creationFee)
            .storeRef(
                beginCell()
                    .storeDict(factoryConfig.poolUninitedCodes, Dictionary.Keys.BigUint(32), Dictionary.Values.Cell())
                    .storeRef(factoryConfig.poolInitedCode)
                    .storeRef(factoryConfig.stakeWalletCode)
                    .storeRef(factoryConfig.jettonMinterCode)
                    .storeUint(factoryConfig.version, 16)
                .endCell()
            )
        .endCell(); 
    const init: StateInit = {
        code: Cell.fromBase64("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"),
        data: data
    };
    let contractAddress = getAddressByStateInit(packStateInit(init.code!!, init.data!!));
    console.log(contractAddress)
    // await provider.sender().send({
    //     to: contractAddress,
    //     value: toNano("0.05"),
    //     body: beginCell().endCell(),
    //     init: init,
    // })
    // await sleep(1000 * 10);
    const poolFactory = provider.open(PoolFactory.createFromAddress(contractAddress));
    factoryConfig = await poolFactory.getStorageData();
    factoryConfig.ownerAddress = Address.parse("EQDtZ91HL9fRGJlGyceT2OEVLXfH3qCAaVUgRA6nz5ZuZRSu");
    await poolFactory.sendSetCode(provider.sender(), await compile("PoolFactory"), poolFactoryConfigToCell(factoryConfig));
    // await poolFactory.sendWithdrawTon(provider.sender());
}
