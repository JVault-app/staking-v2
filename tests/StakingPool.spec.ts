import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Dictionary, beginCell, toNano } from '@ton/core';
import { LockPeriodsValue, RewardJettonsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { StakeWallet, StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter as JettonMinterDefault } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { randomAddress } from '@ton/test-utils';
import { AddrList, Deviders, Gas, OpCodes } from '../wrappers/imports/constants';
import exp from 'constants';

describe('StakingPool', () => {
    let jettonMinterDefaultCode: Cell;
    let jettonWalletCode: Cell;
    let stakingPoolUninitedCode: Cell;
    let stakingPoolCode: Cell;
    let stakeWalletCode: Cell;

    const nowSetting = 2000000000;

    beforeAll(async () => {
        jettonMinterDefaultCode = await compile("JettonMinterDefault");
        jettonWalletCode = await compile("JettonWallet")
        stakingPoolUninitedCode = await compile('StakingPoolUninited');
        stakingPoolCode = await compile('StakingPool');
        stakeWalletCode = await compile('stakeWallet');
    });

    let blockchain: Blockchain;

    let poolAdmin: SandboxContract<TreasuryContract>;
    let poolCreator: SandboxContract<TreasuryContract>;
    let stakingPool: SandboxContract<StakingPool>;

    let user1: SandboxContract<TreasuryContract>;
    let stakeWallet1_1: SandboxContract<StakeWallet>;
    let stakeWallet1_2: SandboxContract<StakeWallet>;
    let stakeWallet1_3: SandboxContract<StakeWallet>;
    let user2: SandboxContract<TreasuryContract>;
    let stakeWallet2_1: SandboxContract<StakeWallet>;
    let stakeWallet2_2: SandboxContract<StakeWallet>;
    let stakeWallet2_3: SandboxContract<StakeWallet>;

    let jettonMinterDefault: SandboxContract<JettonMinterDefault>;
    let poolLockWallet: SandboxContract<JettonWallet>;
    let user1LockWallet: SandboxContract<JettonWallet>;
    let user2LockWallet: SandboxContract<JettonWallet>;
    let poolCreatorWallet: SandboxContract<JettonWallet>;

    let jettonMinterDefault2: SandboxContract<JettonMinterDefault>;
    let poolRewardsWallet: SandboxContract<JettonWallet>;
    let user1RewardsWallet: SandboxContract<JettonWallet>;
    let user2RewardsWallet: SandboxContract<JettonWallet>;
    let creatorRewardsWallet: SandboxContract<JettonWallet>;
    let adminRewardsWallet: SandboxContract<JettonWallet>;
    
    let stakingPoolConfig: StakingPoolConfig;
    let stakeWalletConfig1_1: StakeWalletConfig;
    let stakeWalletConfig1_2: StakeWalletConfig;
    let stakeWalletConfig1_3: StakeWalletConfig;
    let stakeWalletConfig2_1: StakeWalletConfig;
    let stakeWalletConfig2_2: StakeWalletConfig;
    let stakeWalletConfig2_3: StakeWalletConfig;

    let rewardJettonsList: AddrList;
    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting;
        
        poolAdmin = await blockchain.treasury('poolAdmin');
        poolCreator = await blockchain.treasury('poolCreator');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        
        stakingPool = blockchain.openContract(StakingPool.createFromConfig({poolId: 1n, factoryAddress: poolAdmin.address}, stakingPoolUninitedCode));

        jettonMinterDefault = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        await jettonMinterDefault.sendMint(poolAdmin.getSender(), user1.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault.sendMint(poolAdmin.getSender(), user2.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        user1LockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(user1.address)));
        user2LockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(user2.address)));
        // CreatorLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(poolCreator.address)));
        poolLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(stakingPool.address)));

        jettonMinterDefault2 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(0, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        // await jettonMinterDefault2.sendMint(poolAdmin.getSender(), user1.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        // await jettonMinterDefault2.sendMint(poolAdmin.getSender(), user2.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault2.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        user1RewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(user1.address)));
        user2RewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(user2.address)));
        creatorRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolCreator.address)));
        poolRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(stakingPool.address)));
        adminRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolAdmin.address)));

        let lockPeriods: Dictionary<number, LockPeriodsValue> = Dictionary.empty();
        let minterAddr1 = randomAddress(0);
        let minterAddr2 = randomAddress(0);
        let minterAddr3 = randomAddress(0);
        lockPeriods.set(60, {curTvl: 0n, tvlLimit: 100n, rewardMultiplier: 1 * Deviders.REWARDS_DEVIDER, minterAddress: minterAddr1});
        lockPeriods.set(120, {curTvl: 0n, tvlLimit: 50n, rewardMultiplier: 2 * Deviders.REWARDS_DEVIDER, minterAddress: minterAddr2});
        lockPeriods.set(60 * 60 * 24, {curTvl: 0n, tvlLimit: 100000n, rewardMultiplier: 10, minterAddress: minterAddr3});
        let whitelist: AddrList = Dictionary.empty();
        whitelist.set(user1.address, false);
        whitelist.set(user2.address, false);
        stakingPoolConfig = {
            poolId: 1n,
            factoryAddress: poolAdmin.address,
            adminAddress: poolAdmin.address,
            creatorAddress: poolCreator.address,
            stakeWalletCode: stakeWalletCode,
            lockWalletAddress: poolLockWallet.address,
            minDeposit: 2n,
            maxDeposit: 500n,
            tvl: 0n,
            tvlWithMultipliers: 0n,
            rewardJettons: Dictionary.empty(),
            lockPeriods: lockPeriods,
            whitelist: whitelist,
            unstakeCommission: BigInt(0.1 * Number(Deviders.COMMISSION_DEVIDER)),
            unstakeFee: toNano("0.3"),
            collectedCommissions: 0n,
            rewardsCommission: BigInt(0.05 * Number(Deviders.COMMISSION_DEVIDER)),
        }

        // deployment
        let transactionRes = await stakingPool.sendDeploy(poolAdmin.getSender(), toNano('0.05'), stakingPoolConfig, stakingPoolCode);
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolAdmin.address,
            to: stakingPool.address,
            deploy: true,
            success: true,
        });
        
        // adding reward jetton
        rewardJettonsList = Dictionary.empty();
        rewardJettonsList.set(poolRewardsWallet.address, false);
        transactionRes = await stakingPool.sendAddRewardJettons(poolCreator.getSender(), rewardJettonsList);
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolCreator.address,
            to: stakingPool.address,
            success: true
        });

        // adding rewards
        let rewardsToAdd = 1000n;
        let rewardsCommission = rewardsToAdd * stakingPoolConfig.rewardsCommission / Deviders.COMMISSION_DEVIDER;
        let distributionPeriod = 1000
        transactionRes = await creatorRewardsWallet.sendTransfer(
            poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
            StakingPool.addRewardsPayload(blockchain.now, blockchain.now + distributionPeriod)
        );

        // expect(transactionRes.transactions).toHaveTransaction({
        //     from: poolRewardsWallet.address,
        //     to: stakingPool.address,
        //     success: true
        // });
        let poolRewardsBalance = await poolRewardsWallet.getJettonBalance()
        let adminRewardsBalance = await adminRewardsWallet.getJettonBalance()
        expect(poolRewardsBalance).toEqual(rewardsToAdd);
        expect(adminRewardsBalance).toEqual(rewardsCommission);

        // staking jettons 
        let jettonsToStake1 = 40n;
        let lockPeriod1 = 60;
        stakeWallet1_1 = blockchain.openContract(await StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user1.address, lockPeriod1))!!));
        transactionRes = await user1LockWallet.sendTransfer(
            user1.getSender(), jettonsToStake1, stakingPool.address, user1.address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod1)
        );
        // printTransactionFees(transactionRes.transactions);
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakeWallet1_1.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        });

        blockchain.now += distributionPeriod / 10;
        let jettonsToStake2 = 5n;
        let lockPeriod2 = 120;
        stakeWallet1_2 = blockchain.openContract(await StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user1.address, lockPeriod2))!!));
        transactionRes = await user1LockWallet.sendTransfer(
            user1.getSender(), jettonsToStake2, stakingPool.address, user1.address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod2)
        );
        // printTransactionFees(transactionRes.transactions);
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakeWallet1_2.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        });

        let poolLockBalance = await poolLockWallet.getJettonBalance()
        expect(poolLockBalance).toEqual(jettonsToStake1 + jettonsToStake2);
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        expect(stakeWalletConfig1_1.jettonBalance).toEqual(jettonsToStake1);
        stakeWalletConfig1_2 = await stakeWallet1_2.getStorageData();
        expect(stakeWalletConfig1_2.isActive).toBeTruthy();
        expect(stakeWalletConfig1_2.jettonBalance).toEqual(jettonsToStake2);

        // check that everything is ok
        stakingPoolConfig = await stakingPool.getStorageData();
        let tmp = stakingPoolConfig.rewardJettons.get(poolRewardsWallet.address);
        expect(tmp?.distributedRewards).toEqual(Deviders.DISTRIBUTED_REWARDS_DEVIDER * rewardsToAdd / (10n * jettonsToStake1));
        expect(tmp?.rewardsDeposits.get(0)).toEqual({farmingSpeed: Deviders.FARMING_SPEED_DEVIDER, startTime: blockchain.now, endTime: blockchain.now - 100 + distributionPeriod});
        expect(stakingPoolConfig.tvl).toEqual(jettonsToStake1 + jettonsToStake2);
        expect(stakingPoolConfig.tvlWithMultipliers).toEqual(jettonsToStake1 + jettonsToStake2 * 2n);
    });

    it('should deploy, add rewards & receive two deposits', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPool are ready to use
    });

    it('should send rewards', async () => {
        let transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        expect(user1RewardsBalance).toEqual(100n);
        blockchain.now!! += 100;
        transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        expect(user1RewardsBalance).toEqual(180n);
    });
    
    it('should send unstaked jettons', async () => {
        blockchain.now!! += 100;  // cur_rewards = 100 + 80 = 180
        let jettonsToFreeUnstake = 10n;
        let transactionRes = await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), jettonsToFreeUnstake);
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakeWallet1_1.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        });

        blockchain.now!! += 100;  // cur_rewards = 180 + 75 = 255
        await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), jettonsToFreeUnstake);
        let jettonsToForceUnstake = 10n;
        let unstakeCommission = jettonsToForceUnstake * stakingPoolConfig.unstakeCommission / Deviders.COMMISSION_DEVIDER;
        transactionRes = await stakeWallet1_1.sendUnstakeJettons(user1.getSender(), jettonsToFreeUnstake + jettonsToForceUnstake, true, stakingPoolConfig.unstakeFee);
        // printTransactionFees(transactionRes.transactions);
        let user1LockBalance = await user1LockWallet.getJettonBalance();
        expect(user1LockBalance).toEqual(toNano(1000) - 45n + jettonsToFreeUnstake + jettonsToForceUnstake - unstakeCommission);
        stakingPoolConfig = await stakingPool.getStorageData();
        expect(stakingPoolConfig.collectedCommissions).toEqual(unstakeCommission);
        
        blockchain.now!! += 100;  // cur_rewards = 255 + 50 = 305
        transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        expect(user1RewardsBalance).toEqual(305n);
    });

    it('should make jetton transfer', async () => {
        blockchain.now!! += 100;  // cur_rewards_1 = 100 + 80 = 180, cur_rewards_2 = 0
        let transactionRes = await stakeWallet1_1.sendTransfer(
            user1.getSender(), 10n, user2.address, user1.address, toNano(1),
            beginCell().storeUint(0, 32).endCell()
        );
        stakeWallet2_1 = blockchain.openContract(await StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user2.address, 60))!!));
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakeWallet2_1.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        });
        stakeWalletConfig2_1 = await stakeWallet2_1.getStorageData();
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive && stakeWalletConfig2_1.isActive).toBeTruthy();
        expect(stakeWalletConfig1_1.jettonBalance).toEqual(30n);
        expect(stakeWalletConfig2_1.jettonBalance).toEqual(10n);

        blockchain.now!! += 100;  // cur_rewards_1 = 180 + 60 = 240, cur_rewards_2 = 20
        transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        expect(user1RewardsBalance).toEqual(240n);
        transactionRes = await stakeWallet2_1.sendClaimRewards(user2.getSender(), rewardJettonsList);
        let user2RewardsBalance = await user2RewardsWallet.getJettonBalance();
        expect(user2RewardsBalance).toEqual(20n);
    });

});
