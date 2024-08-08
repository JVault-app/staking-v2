import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Dictionary, beginCell, storeCurrencyCollection, toNano } from '@ton/core';
import { LockPeriodsValue, RewardJettonsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { StakeWallet, StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter as JettonMinterDefault } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { randomAddress } from '@ton/test-utils';
import { AddrList, Deviders, Gas, OpCodes } from '../wrappers/imports/constants';
import exp from 'constants';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';

describe('StakingPool', () => {
    let jettonMinterDefaultCode: Cell;
    let jettonWalletCode: Cell;
    let stakingPoolUninitedCode: Cell;
    let stakingPoolCode: Cell;
    let stakeWalletCode: Cell;
    let jettonMinterCode: Cell;
    let poolFactoryCode: Cell;

    const nowSetting = 2000000000;

    beforeAll(async () => {
        jettonMinterDefaultCode = await compile("JettonMinterDefault");
        jettonWalletCode = await compile("JettonWallet")
        stakingPoolUninitedCode = await compile("StakingPoolUninited");
        stakingPoolCode = await compile("StakingPool");
        stakeWalletCode = await compile("StakeWallet");
        jettonMinterCode = await compile("JettonMinter")
        poolFactoryCode = await compile("PoolFactory");
    });

    let blockchain: Blockchain;

    let admin: SandboxContract<TreasuryContract>;
    let poolCreator: SandboxContract<TreasuryContract>;
    
    let factory: SandboxContract<PoolFactory>; 
    let stakingPool: SandboxContract<StakingPool>;

    let lockJettonMinter: SandboxContract<JettonMinterDefault>;
    let poolLockWallet: SandboxContract<JettonWallet>;
    
    let feesJettonMinter: SandboxContract<JettonMinterDefault>;
    let creatorFeesWallet: SandboxContract<JettonWallet>;
    let adminFeesWallet: SandboxContract<JettonWallet>;
    
    let stakingPoolConfig: StakingPoolConfig;
    let factoryConfig: PoolFactoryConfig;

    let rewardJettonsList: AddrList;
    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting;
        
        admin = await blockchain.treasury('factoryAdmin');
        poolCreator = await blockchain.treasury('poolCreator');
        lockJettonMinter = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: admin.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        await lockJettonMinter.sendDeploy(admin.getSender(), toNano("0.05"));
        feesJettonMinter = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: admin.address, content: beginCell().storeUint(0, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        await feesJettonMinter.sendDeploy(admin.getSender(), toNano("0.05"));
        await feesJettonMinter.sendMint(admin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        adminFeesWallet = blockchain.openContract(JettonWallet.createFromAddress(await feesJettonMinter.getWalletAddress(admin.address)));
        creatorFeesWallet = blockchain.openContract(JettonWallet.createFromAddress(await feesJettonMinter.getWalletAddress(poolCreator.address)));

        let poolUninitedCodes: Dictionary<bigint, Cell> = Dictionary.empty();
        poolUninitedCodes.set(0n, stakingPoolUninitedCode);
        factoryConfig = {
            adminAddress: admin.address,
            nextPoolId: 0n,
            minRewardsCommission: BigInt(0.005 * Number(Deviders.COMMISSION_DEVIDER)),  // 0.5%
            unstakeFee: toNano("0.3"),
            feesWalletAddress: randomAddress(),
            creationFee: toNano("50"),
            poolUninitedCodes: poolUninitedCodes,
            poolInitedCode: stakingPoolCode,
            stakeWalletCode: stakeWalletCode,
            jettonMinterCode: jettonMinterCode,
            version: 0n 
        }
        factory = blockchain.openContract(PoolFactory.createFromConfig(factoryConfig, poolFactoryCode));

        let lockPeriods: Dictionary<number, LockPeriodsValue> = Dictionary.empty();
        let periodsDeploy: Dictionary<number, PeriodsDeployValue> = Dictionary.empty()
        let minterAddr1 = randomAddress(0);
        lockPeriods.set(60, {curTvl: 0n, tvlLimit: 1000n, rewardMultiplier: 1 * Deviders.REWARDS_DEVIDER, depositCommission: Math.round(0.2 * Number(Deviders.COMMISSION_DEVIDER)), unstakeCommission: Math.round(0.1 * Number(Deviders.COMMISSION_DEVIDER)), minterAddress: minterAddr1});
        periodsDeploy.set(60, {tvlLimit: 1000n, rewardMultiplier: 1 * Deviders.REWARDS_DEVIDER, depositCommission: Math.round(0.2 * Number(Deviders.COMMISSION_DEVIDER)), unstakeCommission: Math.round(0.1 * Number(Deviders.COMMISSION_DEVIDER))});
        let whitelist: AddrList = Dictionary.empty();
        stakingPoolConfig = {
            inited: false,
            poolId: 0n,
            factoryAddress: factory.address,
            adminAddress: factory.address,
            creatorAddress: poolCreator.address,
            stakeWalletCode: stakeWalletCode,
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
        }
        
        stakingPool = blockchain.openContract(StakingPool.createFromConfig({poolId: 0n, factoryAddress: factory.address}, stakingPoolUninitedCode));
        poolLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await lockJettonMinter.getWalletAddress(stakingPool.address)));
        
        let transactionRes = await factory.sendDeploy(admin.getSender());
        expect(transactionRes.transactions).toHaveTransaction({
            from: admin.address,
            to: factory.address,
            deploy: true,
            success: true,
        })
        
        transactionRes = await factory.sendSetFeesWallet(admin.getSender(), await feesJettonMinter.getWalletAddress(factory.address));
        expect(transactionRes.transactions).toHaveTransaction({
            from: admin.address,
            to: factory.address,
            success: true
        })

        let deployPayload = PoolFactory.getDeployPayload(
            stakingPoolConfig.lockWalletAddress, stakingPoolConfig.minDeposit, stakingPoolConfig.maxDeposit, periodsDeploy, null, stakingPoolConfig.rewardsCommission
        );
        transactionRes = await creatorFeesWallet.sendTransfer(
            poolCreator.getSender(), factoryConfig.creationFee, factory.address, poolCreator.address, toNano("1"), deployPayload
        )
        let stakingPoolConfig2 = await stakingPool.getStorageData();
        expect(stakingPoolConfig2.inited).toBeTruthy();
        expect(stakingPoolConfig2.poolId).toEqual(stakingPoolConfig.poolId)
        expect(stakingPoolConfig2.adminAddress.toString()).toEqual(factory.address.toString())
        expect(stakingPoolConfig2.creatorAddress.toString()).toEqual(poolCreator.address.toString())
        expect(stakingPoolConfig2.lockWalletAddress.toString()).toEqual((await lockJettonMinter.getWalletAddress(stakingPool.address)).toString());
        expect(stakingPoolConfig2.minDeposit).toEqual(stakingPoolConfig.minDeposit)
        expect(stakingPoolConfig2.maxDeposit).toEqual(stakingPoolConfig.maxDeposit)
        expect(stakingPoolConfig2.tvl).toEqual(stakingPoolConfig.tvl)
        expect(stakingPoolConfig2.tvlWithMultipliers).toEqual(stakingPoolConfig.tvlWithMultipliers)
        expect(stakingPoolConfig2.rewardJettons).toEqual(stakingPoolConfig.rewardJettons)
        expect(stakingPoolConfig2.whitelist).toEqual(stakingPoolConfig.whitelist)
        expect(stakingPoolConfig2.unstakeFee).toEqual(stakingPoolConfig.unstakeFee)
        expect(stakingPoolConfig2.collectedCommissions).toEqual(stakingPoolConfig.collectedCommissions)
        expect(stakingPoolConfig2.rewardsCommission).toEqual(stakingPoolConfig.rewardsCommission)
    });

    it('should deploy staking pool', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPool are ready to use
    });

});
