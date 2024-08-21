import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Dictionary, beginCell, storeCurrencyCollection, toNano } from '@ton/core';
import { LockPeriodsValue, RewardJettonsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { StakeWallet, StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter as JettonMinterDefault } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { randomAddress } from '@ton/test-utils';
import { AddrList, Dividers, Gas, OpCodes } from '../wrappers/imports/constants';
import exp from 'constants';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { JettonMinter } from '../wrappers/JettonMinter';

describe('PoolFactory', () => {
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
    let stakingJettonMinter: SandboxContract<JettonMinter>;

    let lockJettonMinter: SandboxContract<JettonMinterDefault>;
    let poolLockWallet: SandboxContract<JettonWallet>;
    
    let feesJettonMinter: SandboxContract<JettonMinterDefault>;
    let creatorFeesWallet: SandboxContract<JettonWallet>;
    let adminFeesWallet: SandboxContract<JettonWallet>;
    
    let stakingPoolConfig: StakingPoolConfig;
    let factoryConfig: PoolFactoryConfig;

    let stakingPoolConfigInited: StakingPoolConfig;
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
        poolUninitedCodes.set(0n, stakingPoolUninitedCode)
        
        factoryConfig = {
            adminAddress: admin.address,
            nextPoolId: 0n,
            collectionContent: Cell.EMPTY,
            minRewardsCommission: BigInt(0.005 * Number(Dividers.COMMISSION_DIVIDER)),  // 0.5%
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
        lockPeriods.set(60, {curTvl: 0n, tvlLimit: 1000n, rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: minterAddr1});
        periodsDeploy.set(60, {tvlLimit: 1000n, rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER))});
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
            rewardsCommission: BigInt(0.05 * Number(Dividers.COMMISSION_DIVIDER)),
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
            op: OpCodes.TAKE_WALLET_ADDRESS,
            success: true
        })
        expect((await factory.getStorageData()).feesWalletAddress).toEqualAddress(await feesJettonMinter.getWalletAddress(factory.address))

        let deployPayload = PoolFactory.getDeployPayload(
            stakingPoolConfig.lockWalletAddress, stakingPoolConfig.minDeposit, stakingPoolConfig.maxDeposit, periodsDeploy, null, stakingPoolConfig.rewardsCommission
        );
        transactionRes = await creatorFeesWallet.sendTransfer(
            poolCreator.getSender(), factoryConfig.creationFee, factory.address, poolCreator.address, toNano("0.155"), deployPayload
        )

        // printTransactionFees(transactionRes.transactions)
        stakingPoolConfigInited = await stakingPool.getStorageData();
        expect(stakingPoolConfigInited.inited).toBeTruthy();
        expect(stakingPoolConfigInited.poolId).toEqual(stakingPoolConfig.poolId)
        expect(stakingPoolConfigInited.adminAddress.toString()).toEqual(factory.address.toString())
        expect(stakingPoolConfigInited.creatorAddress.toString()).toEqual(poolCreator.address.toString())
        expect(stakingPoolConfigInited.lockWalletAddress.toString()).toEqual((await lockJettonMinter.getWalletAddress(stakingPool.address)).toString());
        expect(stakingPoolConfigInited.minDeposit).toEqual(stakingPoolConfig.minDeposit)
        expect(stakingPoolConfigInited.maxDeposit).toEqual(stakingPoolConfig.maxDeposit)
        expect(stakingPoolConfigInited.tvl).toEqual(stakingPoolConfig.tvl)
        expect(stakingPoolConfigInited.tvlWithMultipliers).toEqual(stakingPoolConfig.tvlWithMultipliers)
        expect(stakingPoolConfigInited.rewardJettons).toEqual(stakingPoolConfig.rewardJettons)
        expect(stakingPoolConfigInited.whitelist).toEqual(stakingPoolConfig.whitelist)
        expect(stakingPoolConfigInited.unstakeFee).toEqual(stakingPoolConfig.unstakeFee)
        expect(stakingPoolConfigInited.collectedCommissions).toEqual(stakingPoolConfig.collectedCommissions)
        expect(stakingPoolConfigInited.rewardsCommission).toEqual(stakingPoolConfig.rewardsCommission)
    });

    it('should deploy staking pool', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPool are ready to use
    });

    it('should deploy working jetton minter', async () => {
        let jettonMinterAddress = stakingPoolConfigInited.lockPeriods.get(60)!!.minterAddress;
        stakingJettonMinter = await blockchain.openContract(JettonMinter.createFromAddress(jettonMinterAddress));
        let transactionRes = await stakingJettonMinter.sendDiscovery(admin.getSender(), admin.address, false);
        expect(transactionRes.transactions).toHaveTransaction({op: OpCodes.TAKE_WALLET_ADDRESS, success: true})
    })
    it('change creation fee', async () => {
        let newCreationFee = toNano('100')
        let transactionRes = await factory.sendChangeCreationFee(admin.getSender(), newCreationFee)
        expect(transactionRes.transactions).toHaveTransaction({
            from: admin.address,
            to: factory.address,
            success: true
        })
        expect((await factory.getStorageData()).creationFee).toEqual(newCreationFee)
    });
    it('should accept `take wallet address` and update storage::fees_wallet_address', async () => {
        let new_fees_wallet_address = randomAddress()
        let transactionRes = await factory.sendSetFeesWallet(admin.getSender(), new_fees_wallet_address)
        expect(transactionRes.transactions).toHaveTransaction({
            from: admin.address,
            to: factory.address,
            op: OpCodes.TAKE_WALLET_ADDRESS,
            success: true
        })
        expect((await factory.getStorageData()).feesWalletAddress).toEqualAddress(new_fees_wallet_address)
    });
    

});
