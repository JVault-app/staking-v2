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
        stakeWalletCode = await compile('StakeWallet');
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
    let creatorLockWallet: SandboxContract<JettonWallet>;

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
        creatorLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(poolCreator.address)));
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
        lockPeriods.set(60, {curTvl: 0n, tvlLimit: 1000n, rewardMultiplier: 1 * Deviders.REWARDS_DEVIDER, depositCommission: Math.round(0.2 * Number(Deviders.COMMISSION_DEVIDER)), unstakeCommission: Math.round(0.1 * Number(Deviders.COMMISSION_DEVIDER)), minterAddress: minterAddr1});
        lockPeriods.set(120, {curTvl: 0n, tvlLimit: 500n, rewardMultiplier: 2 * Deviders.REWARDS_DEVIDER, depositCommission: Math.round(0.2 * Number(Deviders.COMMISSION_DEVIDER)), unstakeCommission: Math.round(0.1 * Number(Deviders.COMMISSION_DEVIDER)), minterAddress: minterAddr2});
        lockPeriods.set(60 * 60 * 24, {curTvl: 0n, tvlLimit: 1000000n, rewardMultiplier: 10, depositCommission: Math.round(0.2 * Number(Deviders.COMMISSION_DEVIDER)), unstakeCommission: Math.round(0.1 * Number(Deviders.COMMISSION_DEVIDER)), minterAddress: minterAddr3});
        let whitelist: AddrList = Dictionary.empty();
        whitelist.set(user1.address, false);
        whitelist.set(user2.address, false);
        stakingPoolConfig = {
            inited: false,
            poolId: 1n,
            factoryAddress: poolAdmin.address,
            adminAddress: poolAdmin.address,
            creatorAddress: poolCreator.address,
            stakeWalletCode: stakeWalletCode,
            lockWalletAddress: jettonMinterDefault.address, // will send `op::take_wallet_address` to staking_pool.fc
            minDeposit: 2n,
            maxDeposit: 500n,
            tvl: 0n,
            tvlWithMultipliers: 0n,
            rewardJettons: Dictionary.empty(),
            lockPeriods: lockPeriods,
            whitelist: whitelist,
            unstakeFee: toNano("0.3"),
            collectedCommissions: 0n,
            rewardsCommission: BigInt(0.05 * Number(Deviders.COMMISSION_DEVIDER)),
        }

        // deployment
        let transactionRes = await stakingPool.sendDeploy(poolAdmin.getSender(), toNano('0.05'), stakingPoolConfig, stakingPoolCode);

        expect(transactionRes.transactions).toHaveTransaction({ // staking_pool deploy
            from: poolAdmin.address,
            to: stakingPool.address,
            deploy: true,
            success: true,
        });
        expect(transactionRes.transactions).toHaveTransaction({ // request storage::lock_wallet_address
            from: stakingPool.address,
            to: stakingPoolConfig.lockWalletAddress,
            op: OpCodes.PROVIDE_WALLET_ADDRESS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // take and set storage::lock_wallet_address -> storage::init? := true
            from: stakingPoolConfig.lockWalletAddress,
            to: stakingPool.address,
            op: OpCodes.TAKE_WALLET_ADDRESS,
            success: true
        })

        expect((await stakingPool.getStorageData()).inited).toBeTruthy() // check if storage::lock_wallet_address == true
        expect((await stakingPool.getStorageData()).lockWalletAddress).toEqualAddress(await jettonMinterDefault.getWalletAddress(stakingPool.address)) // check if storage::lock_wallet_address is correct

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // adding reward jetton
        rewardJettonsList = Dictionary.empty();
        rewardJettonsList.set(poolRewardsWallet.address, false);
        transactionRes = await stakingPool.sendAddRewardJettons(poolCreator.getSender(), rewardJettonsList);
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolCreator.address,
            to: stakingPool.address,
            op: OpCodes.ADD_REWARD_JETTONS,
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
        
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolCreator.address,
            to: creatorRewardsWallet.address,
            op: OpCodes.TRANSFER_JETTON,
            success: true
        })

        let poolRewardsBalance = await poolRewardsWallet.getJettonBalance();
        let adminRewardsBalance = await adminRewardsWallet.getJettonBalance();
        expect(poolRewardsBalance).toEqual(rewardsToAdd); // 1000n
        expect(adminRewardsBalance).toEqual(rewardsCommission); // 5000n

        // staking jettons 
        let jettonsToStake1 = 400n;
        let lockPeriod1 = 60;
        let commission1 = 80n;
        stakeWallet1_1 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user1.address, lockPeriod1))!!));
        transactionRes = await user1LockWallet.sendTransfer(
            user1.getSender(), jettonsToStake1, stakingPool.address, user1.address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod1)
        );

        expect(transactionRes.transactions).toHaveTransaction({
            from: stakeWallet1_1.address,
            to: user1.address,
            op: OpCodes.EXCESSES
        });

        blockchain.now += distributionPeriod / 10;
        let jettonsToStake2 = 50n;
        let lockPeriod2 = 120;
        let commission2 = 10n;
        stakeWallet1_2 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user1.address, lockPeriod2))!!));
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
        expect(poolLockBalance).toEqual(jettonsToStake1 + jettonsToStake2); // 400n + 50n = 450n
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        expect(stakeWalletConfig1_1.jettonBalance).toEqual(jettonsToStake1 - commission1);
        stakeWalletConfig1_2 = await stakeWallet1_2.getStorageData();
        expect(stakeWalletConfig1_2.isActive).toBeTruthy();
        expect(stakeWalletConfig1_2.jettonBalance).toEqual(jettonsToStake2 - commission2);

        // check that everything is ok
        stakingPoolConfig = await stakingPool.getStorageData();
        let tmp = stakingPoolConfig.rewardJettons!!.get(poolRewardsWallet.address);
        expect(tmp?.distributedRewards).toEqual(Deviders.DISTRIBUTED_REWARDS_DEVIDER * rewardsToAdd / (10n * (jettonsToStake1 - commission1)));
        expect(tmp?.rewardsDeposits.get(0)).toEqual({distributionSpeed: Deviders.DISTRIBUTION_SPEED_DEVIDER, startTime: blockchain.now, endTime: blockchain.now - 100 + distributionPeriod});
        expect(stakingPoolConfig.tvl).toEqual(jettonsToStake1 + jettonsToStake2 - commission1 - commission2);
        expect(stakingPoolConfig.tvlWithMultipliers).toEqual(jettonsToStake1 - commission1 + (jettonsToStake2 - commission2) * 2n);
        expect(stakingPoolConfig.collectedCommissions).toEqual(commission1 + commission2);
    });

    it('should deploy, add rewards & receive two deposits', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPool are ready to use
    });

    it('should send commissions', async () => {
        //Transactions chain (in order)
        let transactionRes = await stakingPool.sendClaimCommissions(poolCreator.getSender()); // 0
        
        expect(transactionRes.transactions).toHaveTransaction({ // 1
            from: poolCreator.address,
            to: stakingPool.address,
            op: OpCodes.CLAIM_COMMISSIONS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 2
            from: stakingPool.address,
            to: poolLockWallet.address,
            op: OpCodes.TRANSFER_JETTON,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 3
            from: poolLockWallet.address,
            to: creatorLockWallet.address,
            op: OpCodes.INTERNAL_TRANSFER,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 4 fails
            from: creatorLockWallet.address,
            to: poolCreator.address,
            op: OpCodes.TRANSFER_NOTIFICATION,
            success: false
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 5
            from: creatorLockWallet.address,
            to: poolCreator.address,
            op: OpCodes.EXCESSES,
            success: true
        })

        let creatorLockBalance = await creatorLockWallet.getJettonBalance()
        expect(creatorLockBalance).toEqual(90n);
        stakingPoolConfig = await stakingPool.getStorageData();
        expect(stakingPoolConfig.collectedCommissions).toEqual(0n);
    });

    it('should send rewards', async () => {
        //////////////////////////////////////////////////////////////////////////////////////////////////////// 1
        // Transaction Chain (in order)
        let transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList); // 0

        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();

        expect(stakeWalletConfig1_1.isActive).toBeTruthy();

        expect(transactionRes.transactions).toHaveTransaction({ // 1
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.CLAIM_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 2
            from: stakeWallet1_1.address,
            to: stakingPool.address,
            op: OpCodes.SEND_CLAIMED_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 3
            from: stakingPool.address,
            to: poolRewardsWallet.address,
            op: OpCodes.TRANSFER_JETTON,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 4
            from: poolRewardsWallet.address,
            to: user1RewardsWallet.address,
            op: OpCodes.INTERNAL_TRANSFER,
            success: true
        })

        expect(user1RewardsBalance).toEqual(100n);

        expect(transactionRes.transactions).toHaveTransaction({ // 5
            from: user1RewardsWallet.address,
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION,
            success: false
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 6
            from: user1RewardsWallet.address,
            to: user1.address,
            op: OpCodes.EXCESSES,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 7
            from: stakingPool.address,
            to: stakeWallet1_1.address,
            op: OpCodes.UPDATE_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 8
            from: stakeWallet1_1.address,
            to: user1.address,
            op: OpCodes.EXCESSES,
            success: true
        })
 
        //////////////////////////////////////////////////////////////////////////////////////////////////////// 2

        blockchain.now!! += 100;
        transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        
        expect(transactionRes.transactions).toHaveTransaction({
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.CLAIM_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolRewardsWallet.address,
            to: user1RewardsWallet.address,
            op: OpCodes.INTERNAL_TRANSFER,
            success: true
        })

        expect(user1RewardsBalance).toEqual(180n);

        //////////////////////////////////////////////////////////////////////////////////////////////////////// 3

        blockchain.now!! += 100;
        transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        
        expect(transactionRes.transactions).toHaveTransaction({
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.CLAIM_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolRewardsWallet.address,
            to: user1RewardsWallet.address,
            op: OpCodes.INTERNAL_TRANSFER,
            success: true
        })

        expect(user1RewardsBalance).toEqual(260n);
        
    });
    
    it('should send unstaked jettons', async () => {
        blockchain.now!! += 100;  // cur_rewards = 100 + 80 = 180
        let jettonsToFreeUnstake = 80n;

        // Transaction Chain (in order)
        let transactionRes = await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), jettonsToFreeUnstake); // 0

        expect(stakeWalletConfig1_1.isActive).toBeTruthy();

        expect(transactionRes.transactions).toHaveTransaction({ // 1
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.UNSTAKE_REQUEST,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 2
            from: stakeWallet1_1.address,
            to: stakingPool.address,
            op: OpCodes.REQUEST_UPDATE_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 3
            from: stakingPool.address,
            to: stakeWallet1_1.address,
            op: OpCodes.UPDATE_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 4
            from: stakeWallet1_1.address,
            to: user1.address,
            op: OpCodes.EXCESSES,
            success: true
        });

        //////////////////////////////////////////////////////////////////////////////////////////////////////// 2

        blockchain.now!! += 100;  // cur_rewards = 180 + 75 = 255
        await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), jettonsToFreeUnstake);
        let jettonsToForceUnstake = 80n;
        let unstakeCommission = jettonsToForceUnstake * BigInt((stakingPoolConfig.lockPeriods.get(Number(stakeWalletConfig1_1.lockPeriod!!))!!).unstakeCommission) / Deviders.COMMISSION_DEVIDER;

        // Transactions Chain (in order)
        transactionRes = await stakeWallet1_1.sendUnstakeJettons(user1.getSender(), jettonsToFreeUnstake + jettonsToForceUnstake, true, stakingPoolConfig.unstakeFee); // 0

        expect(transactionRes.transactions).toHaveTransaction({ // 1
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.UNSTAKE_JETTONS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 2
            from: stakeWallet1_1.address,
            to: stakingPool.address,
            op: OpCodes.REQUEST_UPDATE_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 3
            from: stakingPool.address,
            to: poolLockWallet.address,
            op: OpCodes.TRANSFER_JETTON,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 4
            from: poolLockWallet.address,
            to: user1LockWallet.address,
            op: OpCodes.INTERNAL_TRANSFER,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 5 fails
            from: user1LockWallet.address,
            to: user1.address,
            op: OpCodes.TRANSFER_NOTIFICATION,
            success: false
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 6
            from: stakingPool.address,
            to: stakeWallet1_1.address,
            op: OpCodes.UPDATE_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 7
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.UNSTAKE_JETTONS,
            success: true
        })

        // printTransactionFees(transactionRes.transactions);
        let user1LockBalance = await user1LockWallet.getJettonBalance();
        expect(user1LockBalance).toEqual(toNano(1000) - 450n + jettonsToFreeUnstake + jettonsToForceUnstake - unstakeCommission);

        stakingPoolConfig = await stakingPool.getStorageData();
        expect(stakingPoolConfig.collectedCommissions).toEqual(unstakeCommission + 90n);  // unstake commission + deposit commission

        let requestsToCancel: Dictionary<number, boolean> = Dictionary.empty();
        requestsToCancel.set(blockchain.now!!, false);
        transactionRes = await stakeWallet1_1.sendCancelUnstakeRequest(user1.getSender(), requestsToCancel);

        blockchain.now!! += 100;  // cur_rewards = 255 + 66 = 321
        transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        expect(user1RewardsBalance).toEqual(321n);
    });

    it('should make jetton transfer', async () => {
        blockchain.now!! += 100;  // cur_rewards_1 = 100 + 80 = 180, cur_rewards_2 = 0

        expect((await stakeWallet1_1.getStorageData()).jettonBalance).toBeGreaterThanOrEqual((await stakeWallet1_1.getStorageData()).minDeposit)

        let transactionRes = await stakeWallet1_1.sendTransfer( // 0
            user1.getSender(), 80n, user2.address, user1.address, toNano(1),
            beginCell().storeUint(0, 32).endCell()
        );

        expect(transactionRes.transactions).toHaveTransaction({ // 1
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.TRANSFER_JETTON,
            success: true
        })

        stakeWallet2_1 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user2.address, 60))!!));

        stakeWalletConfig2_1 = await stakeWallet2_1.getStorageData();
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive && stakeWalletConfig2_1.isActive).toBeTruthy();

        let stakeWallet1_1_OwnerAddress = (await stakeWallet1_1.getStorageData()).ownerAddress
        let stakeWallet2_1_OwnerAddress = (await stakeWallet2_1.getStorageData()).ownerAddress

        expect(transactionRes.transactions).toHaveTransaction({ // 2
            from: stakeWallet1_1.address,
            to: stakeWallet2_1.address,
            op: OpCodes.RECEIVE_JETTONS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 3
            from: stakeWallet2_1.address,
            to: stakingPool.address,
            op: OpCodes.REQUEST_UPDATE_REWARDS, // request forward
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 4
            from: stakeWallet2_1.address,
            to: stakingPool.address,
            op: OpCodes.REQUEST_UPDATE_REWARDS, // request without forward
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 5
            from: stakeWallet2_1.address,
            to: stakeWallet2_1_OwnerAddress,
            op: OpCodes.TRANSFER_NOTIFICATION,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 6
            from: stakeWallet2_1.address,
            to: user1.address,
            op: OpCodes.EXCESSES,
            success: true
        });
        expect(transactionRes.transactions).toHaveTransaction({ // 7
            from: stakingPool.address,
            to: stakeWallet1_1.address,
            op: OpCodes.UPDATE_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 8
            from: stakingPool.address,
            to: stakeWallet2_1.address,
            op: OpCodes.UPDATE_REWARDS,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 9
            from: stakeWallet1_1.address,
            to: stakeWallet1_1_OwnerAddress,
            op: OpCodes.EXCESSES,
            success: true
        })
        expect(transactionRes.transactions).toHaveTransaction({ // 10
            from: stakeWallet2_1.address,
            to: stakeWallet2_1_OwnerAddress,
            op: OpCodes.EXCESSES,
            success: true
        })

        expect(stakeWalletConfig1_1.jettonBalance).toEqual(240n);
        expect(stakeWalletConfig2_1.jettonBalance).toEqual(80n);

        blockchain.now!! += 100;  // cur_rewards_1 = 180 + 60 = 240, cur_rewards_2 = 20
        transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
        let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        expect(user1RewardsBalance).toEqual(240n);
        transactionRes = await stakeWallet2_1.sendClaimRewards(user2.getSender(), rewardJettonsList);
        let user2RewardsBalance = await user2RewardsWallet.getJettonBalance();
        expect(user2RewardsBalance).toEqual(20n);

        expect((await stakeWallet1_1.getStorageData()).jettonBalance).toBeGreaterThanOrEqual((await stakeWallet1_1.getStorageData()).minDeposit)
        expect((await stakeWallet2_1.getStorageData()).jettonBalance).toBeGreaterThanOrEqual((await stakeWallet2_1.getStorageData()).minDeposit)
    });
});
