import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    let poolUninitedCodes: Dictionary<bigint, Cell> = Dictionary.empty();
        poolUninitedCodes.set(0n, await compile('StakingPoolUninited'))

    // let lockJettonMinter = provider.open(JettonMinter.createFromConfig( // kQDamuyGkf1L-LE04a2R8IaGYv3gCKlX030iNWnCM5UBpRVo
    //     {admin: provider.sender().address as Address, content: buildOnchainMetadata({symbol: "TEST", name: "JVault test token"}), wallet_code: await compile('JettonWallet')}, await compile('JettonMinterDefault')));

    // if (! (await provider.isContractDeployed(lockJettonMinter.address))) {
    //     await lockJettonMinter.sendDeploy(provider.sender(), toNano("0.05"));
    //     await provider.waitForDeploy(lockJettonMinter.address);
    // }
    // let lockWallet = provider.open(JettonWallet.createFromAddress(await lockJettonMinter.getWalletAddress(provider.sender().address as Address)));
    // if (await lockWallet.getJettonBalance() < toNano(100000000000)) {
    //     await lockJettonMinter.sendMint(provider.sender(), Address.parse("EQAJiONidzHCTKNMeyXtfBzY3zCZwKjkukrsMhkn2su7DoV0"), toNano(100000000), toNano("0.2"), toNano("0.5"));
    // }
    console.log("lock jetton ✅")

    let feesJettonMinter = provider.open(JettonMinter.createFromAddress(Address.parse("EQC8FoZMlBcZhZ6Pr9sHGyHzkFv9y2B5X9tN61RvucLRzFZz")))
    // let feesJettonMinter = provider.open(JettonMinter.createFromConfig( // 0QAeREapb4fnlHq9ODCvhOTb1sWHs_vjBgroho_k-pIVnHV_
    //     {admin: provider.sender().address as Address, content: buildOnchainMetadata({name: "JVault test token #2", symbol: "JVT", image: "https://jvault.xyz/static/images/logo200.png"}), wallet_code: await compile('JettonWallet')}, await compile('JettonMinterDefault')));

    if (! (await provider.isContractDeployed(feesJettonMinter.address))) {
        await feesJettonMinter.sendDeploy(provider.sender(), toNano("0.05"));
        await provider.waitForDeploy(feesJettonMinter.address);
    }
    let feesWallet = provider.open(JettonWallet.createFromAddress(await feesJettonMinter.getWalletAddress(provider.sender().address as Address)));
    // if (await feesWallet.getJettonBalance() < toNano(1000000000000)) {
    //     await feesJettonMinter.sendMint(provider.sender(), Address.parse("EQAJiONidzHCTKNMeyXtfBzY3zCZwKjkukrsMhkn2su7DoV0"), toNano(100000000), toNano("0.2"), toNano("0.5"));
    // }
    console.log("fees jetton ✅")
    // let poolFactoryConfig: PoolFactoryConfig;
    let poolFactoryConfig: PoolFactoryConfig = {
        adminAddress: provider.sender().address as Address,
        nextPoolId: 0n,
        collectionContent: buildOnchainMetadata({image: "https://jvault.xyz/static/images/factory_image.png", description: "Each NFT in this collection is a staking pool deployed via JVault.xyz", name: "JVault Staking Pools"}),
        minRewardsCommission: BigInt(0.005 * Number(Dividers.COMMISSION_DIVIDER)),  // 0.5%
        unstakeFee: toNano("0.3"),
        feesWalletAddress: provider.sender().address,
        creationFee: toNano("50"),
        poolUninitedCodes: poolUninitedCodes,
        poolInitedCode: await compile('StakingPool'),
        stakeWalletCode: await compile('StakeWallet'),
        jettonMinterCode: await compile('JettonMinter'),
        version: 0n 
    };
    const poolFactory = provider.open(PoolFactory.createFromConfig(poolFactoryConfig, await compile('PoolFactory')));
    // const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("kQAQmdFfoK6EmnniQSOvRmx5P7KKMmwnvRo4It_1iQXXRXOK")))
    if (! (await provider.isContractDeployed(poolFactory.address))) {
        await poolFactory.sendDeploy(provider.sender());
        await provider.waitForDeploy(poolFactory.address);    
    }
    poolFactoryConfig = await poolFactory.getStorageData();
    const factoryFeesWalletAddress = await feesJettonMinter.getWalletAddress(poolFactory.address);
    console.log(factoryFeesWalletAddress, poolFactoryConfig.feesWalletAddress, poolFactoryConfig.feesWalletAddress!!.equals(factoryFeesWalletAddress))
    if (!poolFactoryConfig.feesWalletAddress!!.equals(factoryFeesWalletAddress)) {
        await poolFactory.sendSetFeesWallet(provider.sender(), factoryFeesWalletAddress);
    }
    console.log("factory ✅")
    
    // let lockPeriods: Dictionary<number, LockPeriodsValue> = Dictionary.empty();
    // const lockPeriod1 = 60;
    // const lockPeriod2 = lockPeriod1 * 60 * 24 * 3;
    // lockPeriods.set(lockPeriod1, {curTvl: 0n, tvlLimit: toNano(100), rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: randomAddress(0)});
    // lockPeriods.set(lockPeriod2, {curTvl: 0n, tvlLimit: toNano(10), rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: randomAddress(0)});
    
    // let periodsDeploy: Dictionary<number, PeriodsDeployValue> = Dictionary.empty()
    // periodsDeploy.set(lockPeriod1, {tvlLimit: toNano(100), rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), jettonContent: buildOnchainMetadata({name: "Abob1",decimals: "9",image: "https://media.tenor.com/4cTJ4sDdIn0AAAAe/aboba.png"})});
    // periodsDeploy.set(lockPeriod2, {tvlLimit: toNano(10), rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), jettonContent: buildOnchainMetadata({name: "Abob2",decimals: "9",image: "https://media.tenor.com/4cTJ4sDdIn0AAAAe/aboba.png"})});

    // let stakingPoolConfig: StakingPoolConfig = { // staking pool - kQCwcanqjhpNJ5GVucqn_hNo_7Bs6TbyUE6nmX8fWtvZ-fSC
    //     inited: false,
    //     poolId: 0n,
    //     content: buildOnchainMetadata({name: "Boba", description: "Staking Boba", image: "https://media.tenor.com/4cTJ4sDdIn0AAAAe/aboba.png"}), //
    //     factoryAddress: poolFactory.address,
    //     adminAddress: poolFactory.address,
    //     creatorAddress: provider.sender().address as Address,
    //     stakeWalletCode: await compile('StakeWallet'),
    //     lockWalletAddress: lockJettonMinter.address,
    //     minDeposit: 2n,
    //     maxDeposit: toNano(10),
    //     tvl: 0n,
    //     tvlWithMultipliers: 0n,
    //     rewardJettons: null,
    //     lockPeriods: lockPeriods,
    //     whitelist: null,
    //     unstakeFee: toNano("0.3"),
    //     collectedCommissions: 0n,
    //     rewardsCommission: BigInt(0.05 * Number(Dividers.COMMISSION_DIVIDER)),
    // }

    // let deployPayload = PoolFactory.getDeployPayload(
    //     stakingPoolConfig.lockWalletAddress, stakingPoolConfig.minDeposit, stakingPoolConfig.maxDeposit, periodsDeploy, null, stakingPoolConfig.rewardsCommission, stakingPoolConfig.content
    // );

    // await feesWallet.sendTransfer(
    //     provider.sender(), toNano(50), poolFactory.address, provider.sender().address as Address, toNano("0.5"), deployPayload
    // )
    // let stakingPool = provider.open(StakingPool.createFromConfig({poolId: poolFactoryConfig.nextPoolId, factoryAddress: poolFactory.address}, await compile('StakingPoolUninited')));
    // await provider.waitForDeploy(stakingPool.address, 30);
    // console.log("staking pool ✅")
    // console.log(await stakingPool.getData())
    
}
