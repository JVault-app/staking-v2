import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Dictionary, Transaction, TransactionComputeVm, beginCell, storeCurrencyCollection, toNano } from '@ton/core';
import { LockPeriodsValue, RewardJettonsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { StakeWallet, StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter as JettonMinterDefault } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { findTransactionRequired, randomAddress } from '@ton/test-utils';
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

    let jettonMinterDefault1: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault3: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault4: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault5: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault6: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault7: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault8: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault9: SandboxContract<JettonMinterDefault>;
    let jettonMinterDefault10 : SandboxContract<JettonMinterDefault>;



    let poolLockWallet: SandboxContract<JettonWallet>;
    let user1LockWallet: SandboxContract<JettonWallet>;
    let user2LockWallet: SandboxContract<JettonWallet>;
    let user3: SandboxContract<TreasuryContract>;
    let user3JettonWallet: SandboxContract<JettonWallet>;
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

    let jw1: SandboxContract<JettonWallet>;
    let jw2: SandboxContract<JettonWallet>;
    let jw3: SandboxContract<JettonWallet>;
    let jw4: SandboxContract<JettonWallet>;
    let jw5: SandboxContract<JettonWallet>;
    let jw6: SandboxContract<JettonWallet>;
    let jw7: SandboxContract<JettonWallet>;
    let jw8: SandboxContract<JettonWallet>;
    let jw9: SandboxContract<JettonWallet>;

    let uw1: SandboxContract<JettonWallet>;
    let uw2: SandboxContract<JettonWallet>;
    let uw3: SandboxContract<JettonWallet>;
    let uw4: SandboxContract<JettonWallet>;
    let uw5: SandboxContract<JettonWallet>;
    let uw6: SandboxContract<JettonWallet>;
    let uw7: SandboxContract<JettonWallet>;
    let uw8: SandboxContract<JettonWallet>;
    let uw9: SandboxContract<JettonWallet>;

    let user4: SandboxContract<TreasuryContract>;
    let user5: SandboxContract<TreasuryContract>;
    let user6: SandboxContract<TreasuryContract>;
    let user7: SandboxContract<TreasuryContract>;
    let user8: SandboxContract<TreasuryContract>;
    let user9: SandboxContract<TreasuryContract>;
    let user10: SandboxContract<TreasuryContract>;
    let user11: SandboxContract<TreasuryContract>;


    let rewardJettonsList: AddrList;
    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting;
        
        poolAdmin = await blockchain.treasury('poolAdmin');
        poolCreator = await blockchain.treasury('poolCreator');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');

        user3 = await blockchain.treasury('user3'); //
        user4 = await blockchain.treasury('user3'); //
        user5 = await blockchain.treasury('user3'); //
        user6 = await blockchain.treasury('user3'); //
        user7 = await blockchain.treasury('user3'); //
        user8 = await blockchain.treasury('user3'); //
        user9 = await blockchain.treasury('user3'); //
        user10 = await blockchain.treasury('user3'); //
        user11 = await blockchain.treasury('user3'); //


        
        stakingPool = blockchain.openContract(StakingPool.createFromConfig({poolId: 1n, factoryAddress: poolAdmin.address}, stakingPoolUninitedCode));

        jettonMinterDefault = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        await jettonMinterDefault.sendMint(poolAdmin.getSender(), user1.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault.sendMint(poolAdmin.getSender(), user2.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        user1LockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(user1.address)));
        user2LockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(user2.address)));

        user3JettonWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(user3.address)));

        creatorLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(poolCreator.address)));
        poolLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(stakingPool.address)));

        jettonMinterDefault2 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(0, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        // await jettonMinterDefault2.sendMint(poolAdmin.getSender(), user1.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault2.sendMint(poolAdmin.getSender(), user3.address, toNano(10000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault2.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        user1RewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(user1.address)));
        user2RewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(user2.address)));
        creatorRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolCreator.address)));
        poolRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(stakingPool.address)));
        adminRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolAdmin.address)));

        /////////////////////////////////////////////////////

        jettonMinterDefault1 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(1, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault3 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(2, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault4 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(3, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault5 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(4, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault6 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(5, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault7 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(6, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault8 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(7, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault9 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(8, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        jettonMinterDefault10 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(9, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));

        await jettonMinterDefault1.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault3.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault4.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault5.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault6.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault7.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault8.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault9.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault10.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));

        uw1 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault1.getWalletAddress(poolCreator.address)));
        uw2 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault3.getWalletAddress(poolCreator.address)));
        uw3 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault4.getWalletAddress(poolCreator.address)));
        uw4 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault5.getWalletAddress(poolCreator.address)));
        uw5 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault6.getWalletAddress(poolCreator.address)));
        uw6 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault7.getWalletAddress(poolCreator.address)));
        uw7 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault8.getWalletAddress(poolCreator.address)));
        uw8 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault9.getWalletAddress(poolCreator.address)));
        uw9 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault10.getWalletAddress(poolCreator.address)));

        jw1 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault1.getWalletAddress(stakingPool.address)));
        jw2 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault3.getWalletAddress(stakingPool.address)));
        jw3 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault4.getWalletAddress(stakingPool.address)));
        jw4 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault5.getWalletAddress(stakingPool.address)));
        jw5 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault6.getWalletAddress(stakingPool.address)));
        jw6 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault7.getWalletAddress(stakingPool.address)));
        jw7 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault8.getWalletAddress(stakingPool.address)));
        jw8 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault9.getWalletAddress(stakingPool.address)));
        jw9 = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault10.getWalletAddress(stakingPool.address)));

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
            rewardsDepositsCounter: 0n,
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

        rewardJettonsList.set(poolRewardsWallet.address, false)
        rewardJettonsList.set(jw1.address, false)
        rewardJettonsList.set(jw2.address, false)
        rewardJettonsList.set(jw3.address, false)
        rewardJettonsList.set(jw4.address, false)
        rewardJettonsList.set(jw5.address, false)
        rewardJettonsList.set(jw6.address, false)
        rewardJettonsList.set(jw7.address, false)
        rewardJettonsList.set(jw8.address, false)
        rewardJettonsList.set(jw9.address, false)

        transactionRes = await stakingPool.sendAddRewardJettons(poolCreator.getSender(), rewardJettonsList);
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolCreator.address,
            to: stakingPool.address,
            op: OpCodes.ADD_REWARD_JETTONS,
            success: true
        });

        // adding rewards
        let rewardsToAdd = 1n;
        let rewardsCommission = rewardsToAdd * stakingPoolConfig.rewardsCommission / Deviders.COMMISSION_DEVIDER;
        let distributionPeriod = 1000
       
        for(let i = 0; i < 3; i++) {
            let arr = [creatorRewardsWallet, uw1, uw2, uw3, uw4, uw5, uw6, uw7, uw8, uw9]
            for (let w of arr) {
                transactionRes = await w.sendTransfer(
                    poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
                    StakingPool.addRewardsPayload(blockchain.now, blockchain.now + distributionPeriod)
                );
            }
        }
        

        console.log((await stakingPool.getStorageData()).rewardJettons?.get(jw9.address)?.rewardsDeposits)

        console.log((await stakingPool.getStorageData()).rewardsDepositsCounter)

        // expect((await stakingPool.getStorageData()).rewardsDepositsCounter).toEqual(30n) // check counter

        // printTransactionFees(transactionRes.transactions)

        // let poolRewardsBalance = await poolRewardsWallet.getJettonBalance();
        // let adminRewardsBalance = await adminRewardsWallet.getJettonBalance();
        // expect(poolRewardsBalance).toEqual(rewardsToAdd); // 1000n
        // expect(adminRewardsBalance).toEqual(rewardsCommission); // 5000n

        // staking jettons 
        let jettonsToStake1 = 400n;
        let lockPeriod1 = 60;
        let commission1 = 80n;
        stakeWallet1_1 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user1.address, lockPeriod1))!!));
        transactionRes = await user1LockWallet.sendTransfer(
            user1.getSender(), jettonsToStake1, stakingPool.address, user1.address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod1)
        );


        // expect(transactionRes.transactions).toHaveTransaction({
        //     from: stakeWallet1_1.address,
        //     to: user1.address,
        //     op: OpCodes.EXCESSES
        // });

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
        // expect(transactionRes.transactions).toHaveTransaction({
        //     from: stakeWallet1_2.address,
        //     to: user1.address,
        //     op: OpCodes.EXCESSES
        // });

        // let poolLockBalance = await poolLockWallet.getJettonBalance()
        // expect(poolLockBalance).toEqual(jettonsToStake1 + jettonsToStake2); // 400n + 50n = 450n
        // stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        // expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        // expect(stakeWalletConfig1_1.jettonBalance).toEqual(jettonsToStake1 - commission1);
        // stakeWalletConfig1_2 = await stakeWallet1_2.getStorageData();
        // expect(stakeWalletConfig1_2.isActive).toBeTruthy();
        // expect(stakeWalletConfig1_2.jettonBalance).toEqual(jettonsToStake2 - commission2);

        // // check that everything is ok
        // stakingPoolConfig = await stakingPool.getStorageData();
        // let tmp = stakingPoolConfig.rewardJettons!!.get(poolRewardsWallet.address);
        // expect(tmp?.distributedRewards).toEqual(Deviders.DISTRIBUTED_REWARDS_DEVIDER * rewardsToAdd / (10n * (jettonsToStake1 - commission1)));
        // expect(tmp?.rewardsDeposits.get(0)).toEqual({distributionSpeed: Deviders.DISTRIBUTION_SPEED_DEVIDER, startTime: blockchain.now, endTime: blockchain.now - 100 + distributionPeriod});
        // expect(stakingPoolConfig.tvl).toEqual(jettonsToStake1 + jettonsToStake2 - commission1 - commission2);
        // expect(stakingPoolConfig.tvlWithMultipliers).toEqual(jettonsToStake1 - commission1 + (jettonsToStake2 - commission2) * 2n);
        // expect(stakingPoolConfig.collectedCommissions).toEqual(commission1 + commission2);
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
        expect(creatorLockBalance).toEqual(80n);
        stakingPoolConfig = await stakingPool.getStorageData();
        expect(stakingPoolConfig.collectedCommissions).toEqual(0n);
    });

    it('should send rewards', async () => {
        //////////////////////////////////////////////////////////////////////////////////////////////////////// 1
        // Transaction Chain (in order)
        let transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList); // 0 ;; next

        printTransactionFees(transactionRes.transactions)

        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();

        expect(stakeWalletConfig1_1.isActive).toBeTruthy();

        expect(transactionRes.transactions).toHaveTransaction({ // 1
            from: user1.address,
            to: stakeWallet1_1.address,
            op: OpCodes.CLAIM_REWARDS
        })

        const transferTx2 = findTransactionRequired(transactionRes.transactions, {
            on: stakingPool.address,
            from: stakeWallet1_1.address,
            op: OpCodes.SEND_CLAIMED_REWARDS
        })

    let computedGeneric2: (transaction: Transaction) => TransactionComputeVm;
    computedGeneric2 = (transaction) => {
    if(transaction.description.type !== "generic")
        throw("Expected generic transactionaction");
    if(transaction.description.computePhase.type !== "vm")
        throw("Compute phase expected")
    return transaction.description.computePhase;
    }

    let printTxGasStats: (name: string, trans: Transaction) => bigint;
    printTxGasStats = (name, transaction) => {
        const txComputed = computedGeneric2(transaction);
        console.log(`${name} used ${txComputed.gasUsed} gas`);
        console.log(`${name} gas cost: ${txComputed.gasFees}`);
        return txComputed.gasFees;
    }

    printTxGasStats(`SEND CLAIMED`, transferTx2)
        
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
    
    // it('should send unstaked jettons', async () => {
    //     blockchain.now!! += 100;  // cur_rewards = 100 + 80 = 180
    //     let jettonsToFreeUnstake = 80n;

    //     // Transaction Chain (in order)
    //     let transactionRes = await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), jettonsToFreeUnstake); // 0

    //     expect(stakeWalletConfig1_1.isActive).toBeTruthy();

    //     expect(transactionRes.transactions).toHaveTransaction({ // 1
    //         from: user1.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.UNSTAKE_REQUEST,
    //         success: true
    //     })

    //     expect(transactionRes.transactions).toHaveTransaction({ // 2
    //         from: stakeWallet1_1.address,
    //         to: stakingPool.address,
    //         op: OpCodes.REQUEST_UPDATE_REWARDS,
    //         success: true
    //     })

    //     const transferTx = findTransactionRequired(transactionRes.transactions, {
    //         on: stakingPool.address,
    //         from: stakeWallet1_1.address,
    //         op: OpCodes.REQUEST_UPDATE_REWARDS,
    //         success: true
    //     });

    //     let computedGeneric: (transaction: Transaction) => TransactionComputeVm;
    //     computedGeneric = (transaction) => {
    //     if(transaction.description.type !== "generic")
    //         throw("Expected generic transactionaction");
    //     if(transaction.description.computePhase.type !== "vm")
    //         throw("Compute phase expected")
    //     return transaction.description.computePhase;
    //     }

    //     let printTxGasStats: (name: string, trans: Transaction) => bigint;
    //     printTxGasStats = (name, transaction) => {
    //         const txComputed = computedGeneric(transaction);
    //         console.log(`${name} used ${txComputed.gasUsed} gas`);
    //         console.log(`${name} gas cost: ${txComputed.gasFees}`);
    //         return txComputed.gasFees;
    //     }
    //     printTxGasStats(`request upd rew`, transferTx);

    //     expect(transactionRes.transactions).toHaveTransaction({ // 3
    //         from: stakingPool.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.UPDATE_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 4
    //         from: stakeWallet1_1.address,
    //         to: user1.address,
    //         op: OpCodes.EXCESSES,
    //         success: true
    //     });

    //     //////////////////////////////////////////////////////////////////////////////////////////////////////// 2

    //     blockchain.now!! += 100;  // cur_rewards = 180 + 75 = 255
    //     await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), jettonsToFreeUnstake);
    //     let jettonsToForceUnstake = 80n;
    //     let unstakeCommission = jettonsToForceUnstake * BigInt((stakingPoolConfig.lockPeriods.get(Number(stakeWalletConfig1_1.lockPeriod!!))!!).unstakeCommission) / Deviders.COMMISSION_DEVIDER;

    //     // Transactions Chain (in order)
    //     transactionRes = await stakeWallet1_1.sendUnstakeJettons(user1.getSender(), jettonsToFreeUnstake + jettonsToForceUnstake, true, stakingPoolConfig.unstakeFee); // 0

    //     expect(transactionRes.transactions).toHaveTransaction({ // 1
    //         from: user1.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.UNSTAKE_JETTONS,
    //         success: true
    //     })
    //     const transferTx1 = findTransactionRequired(transactionRes.transactions, {
    //         on: stakeWallet1_1.address,
    //         from: user1.address,
    //         op: OpCodes.UNSTAKE_JETTONS,
    //         success: true
    //     });

    //     let computedGeneric1: (transaction: Transaction) => TransactionComputeVm;
    //     computedGeneric1 = (transaction) => {
    //     if(transaction.description.type !== "generic")
    //         throw("Expected generic transactionaction");
    //     if(transaction.description.computePhase.type !== "vm")
    //         throw("Compute phase expected")
    //     return transaction.description.computePhase;
    //     }

    //     printTxGasStats = (name, transaction) => {
    //         const txComputed = computedGeneric1(transaction);
    //         console.log(`${name} used ${txComputed.gasUsed} gas`);
    //         console.log(`${name} gas cost: ${txComputed.gasFees}`);
    //         return txComputed.gasFees;
    //     }
    //     printTxGasStats(`unstake jettons`, transferTx1);
        
    //     expect(transactionRes.transactions).toHaveTransaction({ // 2
    //         from: stakeWallet1_1.address,
    //         to: stakingPool.address,
    //         op: OpCodes.REQUEST_UPDATE_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 3
    //         from: stakingPool.address,
    //         to: poolLockWallet.address,
    //         op: OpCodes.TRANSFER_JETTON,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 4
    //         from: poolLockWallet.address,
    //         to: user1LockWallet.address,
    //         op: OpCodes.INTERNAL_TRANSFER,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 5 fails
    //         from: user1LockWallet.address,
    //         to: user1.address,
    //         op: OpCodes.TRANSFER_NOTIFICATION,
    //         success: false
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 6
    //         from: stakingPool.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.UPDATE_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 7
    //         from: user1.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.UNSTAKE_JETTONS,
    //         success: true
    //     })

    //     // printTransactionFees(transactionRes.transactions);
    //     let user1LockBalance = await user1LockWallet.getJettonBalance();
    //     expect(user1LockBalance).toEqual(toNano(1000) - 450n + jettonsToFreeUnstake + jettonsToForceUnstake - unstakeCommission);

    //     stakingPoolConfig = await stakingPool.getStorageData();
    //     expect(stakingPoolConfig.collectedCommissions).toEqual(unstakeCommission + 90n);  // unstake commission + deposit commission

    //     let requestsToCancel: Dictionary<number, boolean> = Dictionary.empty();
    //     requestsToCancel.set(blockchain.now!!, false);
    //     transactionRes = await stakeWallet1_1.sendCancelUnstakeRequest(user1.getSender(), requestsToCancel);
        
    //     const transferTx2 = findTransactionRequired(transactionRes.transactions, {
    //         on: stakeWallet1_1.address,
    //         from: user1.address,
    //         op: OpCodes.CANCEL_UNSTAKE_REQUEST
    //     })

    //     let computedGeneric2: (transaction: Transaction) => TransactionComputeVm;
    //     computedGeneric2 = (transaction) => {
    //     if(transaction.description.type !== "generic")
    //         throw("Expected generic transactionaction");
    //     if(transaction.description.computePhase.type !== "vm")
    //         throw("Compute phase expected")
    //     return transaction.description.computePhase;
    //     }

    //     printTxGasStats(`cancel unstake request`, transferTx2)

    //     blockchain.now!! += 100;  // cur_rewards = 255 + 66 = 321
    //     transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
    //     let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
    //     expect(user1RewardsBalance).toEqual(321n);
    // });

    // it('should make jetton transfer', async () => {
    //     blockchain.now!! += 100;  // cur_rewards_1 = 100 + 80 = 180, cur_rewards_2 = 0

    //     expect((await stakeWallet1_1.getStorageData()).jettonBalance).toBeGreaterThanOrEqual((await stakeWallet1_1.getStorageData()).minDeposit)

    //     let transactionRes = await stakeWallet1_1.sendTransfer( // 0
    //         user1.getSender(), 80n, user2.address, user1.address, toNano(0.1),
    //         beginCell().storeUint(0, 32).endCell()
    //     );

    //     printTransactionFees(transactionRes.transactions)

    //     expect(transactionRes.transactions).toHaveTransaction({ // 1
    //         from: user1.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.TRANSFER_JETTON,
    //         success: true
    //     })

    //     const transferTx = findTransactionRequired(transactionRes.transactions, {
    //         on: stakeWallet1_1.address,
    //         from: user1.address,
    //         op: OpCodes.TRANSFER_JETTON,
    //         success: true
    //     });

    //     let computedGeneric: (transaction: Transaction) => TransactionComputeVm;
    //     computedGeneric = (transaction) => {
    //     if(transaction.description.type !== "generic")
    //         throw("Expected generic transactionaction");
    //     if(transaction.description.computePhase.type !== "vm")
    //         throw("Compute phase expected")
    //     return transaction.description.computePhase;
    //     }

    //     let printTxGasStats: (name: string, trans: Transaction) => bigint;
    //     printTxGasStats = (name, transaction) => {
    //         const txComputed = computedGeneric(transaction);
    //         console.log(`${name} used ${txComputed.gasUsed} gas`);
    //         console.log(`${name} gas cost: ${txComputed.gasFees}`);
    //         return txComputed.gasFees;
    //     }
    //     printTxGasStats(`stake jet trans`, transferTx);

    //     stakeWallet2_1 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user2.address, 60))!!));

    //     stakeWalletConfig2_1 = await stakeWallet2_1.getStorageData();
    //     stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
    //     expect(stakeWalletConfig1_1.isActive && stakeWalletConfig2_1.isActive).toBeTruthy();

    //     let stakeWallet1_1_OwnerAddress = (await stakeWallet1_1.getStorageData()).ownerAddress
    //     let stakeWallet2_1_OwnerAddress = (await stakeWallet2_1.getStorageData()).ownerAddress

    //     expect(transactionRes.transactions).toHaveTransaction({ // 2
    //         from: stakeWallet1_1.address,
    //         to: stakeWallet2_1.address,
    //         op: OpCodes.RECEIVE_JETTONS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 3
    //         from: stakeWallet2_1.address,
    //         to: stakingPool.address,
    //         op: OpCodes.REQUEST_UPDATE_REWARDS, // request forward
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 4
    //         from: stakeWallet2_1.address,
    //         to: stakingPool.address,
    //         op: OpCodes.REQUEST_UPDATE_REWARDS, // request without forward
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 5
    //         from: stakeWallet2_1.address,
    //         to: stakeWallet2_1_OwnerAddress,
    //         op: OpCodes.TRANSFER_NOTIFICATION,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 6
    //         from: stakeWallet2_1.address,
    //         to: user1.address,
    //         op: OpCodes.EXCESSES,
    //         success: true
    //     });
    //     expect(transactionRes.transactions).toHaveTransaction({ // 7
    //         from: stakingPool.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.UPDATE_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 8
    //         from: stakingPool.address,
    //         to: stakeWallet2_1.address,
    //         op: OpCodes.UPDATE_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 9
    //         from: stakeWallet1_1.address,
    //         to: stakeWallet1_1_OwnerAddress,
    //         op: OpCodes.EXCESSES,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 10
    //         from: stakeWallet2_1.address,
    //         to: stakeWallet2_1_OwnerAddress,
    //         op: OpCodes.EXCESSES,
    //         success: true
    //     })

    //     expect(stakeWalletConfig1_1.jettonBalance).toEqual(240n);
    //     expect(stakeWalletConfig2_1.jettonBalance).toEqual(80n);

    //     blockchain.now!! += 100;  // cur_rewards_1 = 180 + 60 = 240, cur_rewards_2 = 20
    //     transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
    //     let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
    //     expect(user1RewardsBalance).toEqual(240n);
    //     transactionRes = await stakeWallet2_1.sendClaimRewards(user2.getSender(), rewardJettonsList);
    //     let user2RewardsBalance = await user2RewardsWallet.getJettonBalance();
    //     expect(user2RewardsBalance).toEqual(20n);

    //     expect((await stakeWallet1_1.getStorageData()).jettonBalance).toBeGreaterThanOrEqual((await stakeWallet1_1.getStorageData()).minDeposit)
    //     expect((await stakeWallet2_1.getStorageData()).jettonBalance).toBeGreaterThanOrEqual((await stakeWallet2_1.getStorageData()).minDeposit)
    // });
});