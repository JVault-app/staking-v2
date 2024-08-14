import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Deviders } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    let poolUninitedCodes: Dictionary<bigint, Cell> = Dictionary.empty();
        poolUninitedCodes.set(0n, await compile('StakingPoolUninited'))

    let lockJettonMinter = provider.open(JettonMinter.createFromConfig( // kQDamuyGkf1L-LE04a2R8IaGYv3gCKlX030iNWnCM5UBpRVo
        {admin: provider.sender().address as Address, content: Cell.EMPTY, wallet_code: await compile('JettonWallet')}, await compile('JettonMinterDefault')));

    // await lockJettonMinter.sendDeploy(provider.sender(), toNano("0.05"));

   
    
    let feesJettonMinter = provider.open(JettonMinter.createFromConfig( // 0QAeREapb4fnlHq9ODCvhOTb1sWHs_vjBgroho_k-pIVnHV_
        {admin: provider.sender().address as Address, content: beginCell().storeUint(0, 32).endCell(), wallet_code: await compile('JettonWallet')}, await compile('JettonMinterDefault')));
        // await feesJettonMinter.sendMint(provider.sender(), provider.sender().address as Address, toNano(1000), toNano("0.2"), toNano("0.5"));

    // await feesJettonMinter.sendDeploy(provider.sender(), toNano("0.05"));

    let lockPeriods: Dictionary<number, LockPeriodsValue> = Dictionary.empty();
    lockPeriods.set(60, {curTvl: 0n, tvlLimit: 1000n, rewardMultiplier: 1 * Deviders.REWARDS_DEVIDER, depositCommission: Math.round(0.2 * Number(Deviders.COMMISSION_DEVIDER)), unstakeCommission: Math.round(0.1 * Number(Deviders.COMMISSION_DEVIDER)), minterAddress: randomAddress(0)});
        
    let periodsDeploy: Dictionary<number, PeriodsDeployValue> = Dictionary.empty()
    periodsDeploy.set(60, {tvlLimit: 1000n, rewardMultiplier: 1 * Deviders.REWARDS_DEVIDER, depositCommission: Math.round(0.2 * Number(Deviders.COMMISSION_DEVIDER)), unstakeCommission: Math.round(0.1 * Number(Deviders.COMMISSION_DEVIDER)), jettonContent: buildOnchainMetadata({name: "Abob",decimals: "9",image: "https://media.tenor.com/4cTJ4sDdIn0AAAAe/aboba.png"})});

    // const poolFactory = provider.open(PoolFactory.createFromConfig({
    //     adminAddress: provider.sender().address as Address,
    //     nextPoolId: 0n,
    //     collectionContent: buildOnchainMetadata({image: "https://jvault.xyz/static/images/logo256.png", description: "Test staking pool", name: "Staking Pool"}),
    //     minRewardsCommission: BigInt(0.005 * Number(Deviders.COMMISSION_DEVIDER)),  // 0.5%
    //     unstakeFee: toNano("0.3"),
    //     feesWalletAddress: randomAddress(),
    //     creationFee: toNano("50"),
    //     poolUninitedCodes: poolUninitedCodes,
    //     poolInitedCode: await compile('StakingPool'),
    //     stakeWalletCode: await compile('StakeWallet'),
    //     jettonMinterCode: await compile('JettonMinter'),
    //     version: 0n 
    // }, await compile('PoolFactory')));

    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("kQCFwlJa6nDtBAZYfk4nBaN0ria867qC0iWi5o2pS6apSJh4")))

    let stakingPoolConfig: StakingPoolConfig = { // staking pool - kQCwcanqjhpNJ5GVucqn_hNo_7Bs6TbyUE6nmX8fWtvZ-fSC
        inited: false,
        poolId: 0n,
        content: buildOnchainMetadata({name: "Boba", description: "Staking Boba", image: "https://media.tenor.com/4cTJ4sDdIn0AAAAe/aboba.png"}), //
        factoryAddress: poolFactory.address,
        adminAddress: poolFactory.address,
        creatorAddress: provider.sender().address as Address,
        stakeWalletCode: await compile('StakeWallet'),
        lockWalletAddress: lockJettonMinter.address,
        minDeposit: 2n,
        maxDeposit: 500n,
        tvl: 0n,
        tvlWithMultipliers: 0n,
        rewardJettons: null,
        lockPeriods: lockPeriods,
        whitelist: null,
        unstakeFee: toNano("0.3"),
        collectedCommissions: 0n,
        rewardsCommission: BigInt(0.05 * Number(Deviders.COMMISSION_DEVIDER)),
        rewardsDepositsCounter: 30n
    }

    let stakingPool = provider.open(StakingPool.createFromConfig({poolId: 0n, factoryAddress: poolFactory.address}, await compile('StakingPoolUninited')));

    // const stakingpool = provider.open(StakingPool.createFromAddress(Address.parse("kQCsXxIvgmxLijemnUjA-z6f3aslXp17g-sMphQByLUFSE7L")))


    let creatorFeesWallet = provider.open(JettonWallet.createFromAddress(await feesJettonMinter.getWalletAddress(provider.sender().address as Address)));

    let deployPayload = PoolFactory.getDeployPayload(
        stakingPoolConfig.lockWalletAddress, stakingPoolConfig.minDeposit, stakingPoolConfig.maxDeposit, periodsDeploy, null, stakingPoolConfig.rewardsCommission, stakingPoolConfig.content
    );

    await creatorFeesWallet.sendTransfer(
        provider.sender(), toNano(50), poolFactory.address, provider.sender().address as Address, toNano("0.5"), deployPayload
    )

    // console.log(await stakingPool.getData())

    // await poolFactory.sendDeploy(provider.sender());

    // await provider.waitForDeploy(poolFactory.address);

    // await poolFactory.sendSetFeesWallet(provider.sender(), await feesJettonMinter.getWalletAddress(poolFactory.address));

    // run methods on `poolFactory`
}
