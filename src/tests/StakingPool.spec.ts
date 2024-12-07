import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Dictionary, Transaction, TransactionComputeVm, beginCell, storeCurrencyCollection, toNano } from '@ton/core';
import { LockPeriodsValue, RewardJettonsValue, StakingPool, StakingPoolConfig, stakingPoolConfigToCell, stakingPoolInitedData } from '../wrappers/StakingPool';
import { StakeWallet, StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';
import { ReferrerWallet, ReferrerWalletConfig } from '../wrappers/ReferrerWallet';
import { InviteeWallet, InviteeWalletConfig } from '../wrappers/InviteeWallet';
import { StakingPoolUninited, StakingPoolUninitedConfig, stakingPoolUninitedConfigToCell } from '../wrappers/StakingPoolUninited';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter as JettonMinterDefault } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { findTransactionRequired, randomAddress } from '@ton/test-utils';
import { AddrList, Dividers, Gas, OpCodes } from '../wrappers/imports/constants';
import { sign, KeyPair, keyPairFromSeed, getSecureRandomBytes } from '@ton/crypto';
import { generateKeyPair } from 'crypto';


export function collectCellStats(cell: Cell, visited:Array<string>, skipRoot: boolean = false) {
    let bits  = skipRoot ? 0 : cell.bits.length;
    let cells = skipRoot ? 0 : 1;
    let hash = cell.hash().toString();
    if (visited.includes(hash)) {
        // We should not account for current cell data if visited
        return {cells: 0, bits: 0};
    }
    else {
        visited.push(hash);
    }
    for (let ref of cell.refs) {
        let r = collectCellStats(ref, visited);
        cells += r.cells;
        bits += r.bits;
    }
    return {bits: bits, cells: cells};
}


describe('StakingPool', () => {
    let jettonMinterDefaultCode: Cell;
    let jettonWalletCode: Cell;
    let stakingPoolUninitedCode: Cell;
    let stakingPoolCode: Cell;
    let stakeWalletCode: Cell;
    let referrerWalletCode: Cell;
    let inviteeWalletCode: Cell;

    const CALCULATE_GAS = false;
    const nowSetting = 2000000000;

    beforeAll(async () => {
        jettonMinterDefaultCode = await compile("JettonMinterDefault");
        jettonWalletCode = await compile("JettonWallet")
        stakingPoolUninitedCode = await compile('StakingPoolUninited');
        stakingPoolCode = await compile('StakingPool');
        stakeWalletCode = await compile('StakeWallet');
        referrerWalletCode = await compile('ReferrerWallet');
        inviteeWalletCode = await compile('InviteeWallet');
    });

    let blockchain: Blockchain;

    let poolAdmin: SandboxContract<TreasuryContract>;
    let poolCreator: SandboxContract<TreasuryContract>;
    let stakingPool: SandboxContract<StakingPool>;

    let user1: SandboxContract<TreasuryContract>;
    let stakeWallet1_1: SandboxContract<StakeWallet>;
    let stakeWallet1_2: SandboxContract<StakeWallet>;
    let stakeWallet1_3: SandboxContract<StakeWallet>;
    let referrerWallet1: SandboxContract<ReferrerWallet>;
    let inviteeWallet1: SandboxContract<InviteeWallet>;

    let user2: SandboxContract<TreasuryContract>;
    let stakeWallet2_1: SandboxContract<StakeWallet>;
    let stakeWallet2_2: SandboxContract<StakeWallet>;
    let stakeWallet2_3: SandboxContract<StakeWallet>;
    let referrerWallet2: SandboxContract<ReferrerWallet>;
    let inviteeWallet2: SandboxContract<InviteeWallet>;

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
    let referrerWalletConfig1: ReferrerWalletConfig;
    let inviteeWalletConfig1: InviteeWalletConfig;
    let stakeWalletConfig2_1: StakeWalletConfig;
    let stakeWalletConfig2_2: StakeWalletConfig;
    let stakeWalletConfig2_3: StakeWalletConfig;
    let referrerWalletConfig2: ReferrerWalletConfig;
    let inviteeWalletConfig2: InviteeWalletConfig;

    let rewardsJettonMinters: Array<SandboxContract<JettonMinterDefault>> = [];
    let poolRewardsWallets: Array<SandboxContract<JettonWallet>> = [];
    let creatorRewardsWallets: Array<SandboxContract<JettonWallet>> = [];

    let rewardJettonsList: AddrList;

    const publicKey = Buffer.from("6580630b8e03d33193195e28fa60cff750c608dbb8a2dd9f1196425b353ee2c8", 'hex');
    const secretKey = Buffer.from("a697139dab71a6ec0e2abf3232c4ebe2ba5c383c18a0229e9e3705aacfa3d9c96580630b8e03d33193195e28fa60cff750c608dbb8a2dd9f1196425b353ee2c8", 'hex');
    
    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting;
        
        poolAdmin = await blockchain.treasury('poolAdmin');
        console.log(poolAdmin.address.toString());
        poolCreator = await blockchain.treasury('poolCreator');
        user1 = await blockchain.treasury('user1');
        console.log("REFERRER ADDRESS: ", BigInt('0x' + user1.address.hash.toString('hex')));
        user2 = await blockchain.treasury('user2');
        
        stakingPool = blockchain.openContract(StakingPool.createFromConfig({poolId: 1n, factoryAddress: poolAdmin.address}, stakingPoolUninitedCode));

        jettonMinterDefault = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        await jettonMinterDefault.sendMint(poolAdmin.getSender(), user1.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault.sendMint(poolAdmin.getSender(), user2.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        user1LockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(user1.address)));
        user2LockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(user2.address)));

        creatorLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(poolCreator.address)));
        poolLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(stakingPool.address)));
        console.log(BigInt('0x' + poolLockWallet.address.hash.toString('hex')));
        jettonMinterDefault2 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(0, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        // await jettonMinterDefault2.sendMint(poolAdmin.getSender(), user1.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault2.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        user1RewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(user1.address)));
        user2RewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(user2.address)));
        creatorRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolCreator.address)));
        poolRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(stakingPool.address)));
        adminRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolAdmin.address)));

        /////////////////////////////////////////////////////

        let lockPeriods: Dictionary<number, LockPeriodsValue> = Dictionary.empty();
        let minterAddr1 = randomAddress(0);
        let minterAddr2 = randomAddress(0);
        let minterAddr3 = randomAddress(0);
        lockPeriods.set(60, {curTvl: 0n, tvlLimit: 200000n, rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: minterAddr1});
        lockPeriods.set(120, {curTvl: 0n, tvlLimit: 200000n, rewardMultiplier: 2 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: minterAddr2});
        lockPeriods.set(60 * 60 * 24, {curTvl: 0n, tvlLimit: 1000000n, rewardMultiplier: 10, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: minterAddr3});
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
            minDeposit: 200n,
            maxDeposit: 200000n,
            tvl: 0n,
            tvlWithMultipliers: 0n,
            rewardJettons: Dictionary.empty(),
            lockPeriods: lockPeriods,
            whitelist: whitelist,
            unstakeFee: toNano("0.3"),
            collectedCommissions: 0n,
            rewardsCommission: BigInt(0.05 * Number(Dividers.COMMISSION_DIVIDER)),
        }

        // deployment
        let transactionRes = await stakingPool.sendDeploy(poolAdmin.getSender(), toNano('0.1'), stakingPoolConfig, stakingPoolCode);
        printTransactionFees(transactionRes.transactions);

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
        //
        // adding reward jetton
        rewardJettonsList = Dictionary.empty();

        rewardJettonsList.set(poolRewardsWallet.address, false)

        transactionRes = await stakingPool.sendAddRewardJettons(poolCreator.getSender(), rewardJettonsList);
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolCreator.address,
            to: stakingPool.address,
            op: OpCodes.ADD_REWARD_JETTONS,
            success: true
        });

        // adding rewards
        let rewardsToAdd = 100000n;
        let rewardsCommission = rewardsToAdd * stakingPoolConfig.rewardsCommission / Dividers.COMMISSION_DIVIDER;
        let distributionPeriod = 1000
       
        transactionRes = await creatorRewardsWallet.sendTransfer(
            poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
            StakingPool.addRewardsPayload(blockchain.now, blockchain.now + distributionPeriod)
        );
        
        let poolRewardsBalance = await poolRewardsWallet.getJettonBalance();
        let adminRewardsBalance = await adminRewardsWallet.getJettonBalance();
        expect(poolRewardsBalance).toEqual(rewardsToAdd); // 100000n
        expect(adminRewardsBalance).toEqual(rewardsCommission); // 50000n

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // referrer wallet deployment
        referrerWalletConfig1 = {
            ownerAddress: user1.address,
            revenueShare: Number(Dividers.REVENUE_SHARE_DIVIDER) * 0.05,
            poolsDict: Dictionary.empty(),
            inviteeWalletCode: inviteeWalletCode,
        }
        referrerWallet1 = blockchain.openContract(ReferrerWallet.createFromConfig(referrerWalletConfig1, referrerWalletCode));
        transactionRes = await referrerWallet1.sendDeploy(user1.getSender(), toNano('0.05'), referrerWalletConfig1.ownerAddress, referrerWalletConfig1.revenueShare, inviteeWalletCode, secretKey);
        expect(transactionRes.transactions).toHaveTransaction({
            from: user1.address,
            to: referrerWallet1.address,
            success: true,
            deploy: true
        });
        referrerWalletConfig1 = await referrerWallet1.getStorageData();
        expect(referrerWalletConfig1.ownerAddress.toString()).toEqual(user1.address.toString());
        expect(referrerWalletConfig1.revenueShare).toEqual(Number(Dividers.REVENUE_SHARE_DIVIDER) * 0.05);
        expect(referrerWalletConfig1.inviteeWalletCode.hash().toString('hex')).toEqual(inviteeWalletCode.hash().toString('hex'));
        console.log("REFERRER WALLET ADDRESS: ", BigInt('0x' + referrerWallet1.address.hash.toString('hex')));
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
        // staking jettons 
        let jettonsToStake1 = 40000n;
        let lockPeriod1 = 60;
        let commission1 = 8000n;
        stakeWallet1_1 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user1.address, lockPeriod1))!!));
        transactionRes = await user1LockWallet.sendTransfer(
            user1.getSender(), jettonsToStake1, stakingPool.address, user1.address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod1)
        );
        printTransactionFees(transactionRes.transactions);

        blockchain.now += distributionPeriod / 10;

        let jettonsToStake2 = 5000n;
        let lockPeriod2 = 120;
        let commission2 = 1000n;
        stakeWallet2_2 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user2.address, lockPeriod2))!!));
        transactionRes = await user2LockWallet.sendTransfer(
            user2.getSender(), jettonsToStake2, stakingPool.address, user2.address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod2, user1.address)
        );        
        printTransactionFees(transactionRes.transactions);
        let referrerBalanceChange = 2n * (jettonsToStake2 - commission2) * BigInt(referrerWalletConfig1.revenueShare) / Dividers.REVENUE_SHARE_DIVIDER;
        console.log(referrerBalanceChange);
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakeWallet2_2.address,
            to: user2.address,
            op: OpCodes.EXCESSES
        });

        let poolLockBalance = await poolLockWallet.getJettonBalance()
        expect(poolLockBalance).toEqual(jettonsToStake1 + jettonsToStake2); // 40000n + 5000n = 45000n
        stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
        expect(stakeWalletConfig1_1.isActive).toBeTruthy();
        expect(stakeWalletConfig1_1.jettonBalance).toEqual(jettonsToStake1 - commission1);
        stakeWalletConfig2_2 = await stakeWallet2_2.getStorageData();
        expect(stakeWalletConfig2_2.isActive).toBeTruthy();
        expect(stakeWalletConfig2_2.jettonBalance).toEqual(jettonsToStake2 - commission2);

        // check that everything is ok
        stakingPoolConfig = await stakingPool.getStorageData();
        let tmp = stakingPoolConfig.rewardJettons!!.get(poolRewardsWallet.address)!!;
        console.log(Dividers.DISTRIBUTED_REWARDS_DIVIDER, jettonsToStake1 - commission1);
        expect(tmp.distributedRewards).toEqual(Dividers.DISTRIBUTED_REWARDS_DIVIDER * rewardsToAdd / (10n * (jettonsToStake1 - commission1)));
        expect(tmp.rewardsDeposits.get(0)).toEqual({distributionSpeed: Dividers.DISTRIBUTION_SPEED_DIVIDER * 100n, startTime: blockchain.now, endTime: blockchain.now - 100 + distributionPeriod});
        expect(stakingPoolConfig.tvl).toEqual(jettonsToStake1 - commission1 + jettonsToStake2 - commission2);
        expect(stakingPoolConfig.tvlWithMultipliers).toEqual(jettonsToStake1 - commission1 + (jettonsToStake2 - commission2) * 2n + referrerBalanceChange);
        expect(stakingPoolConfig.collectedCommissions).toEqual(commission1 + commission2);
    });

    it('should deploy, add rewards & receive two deposits', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPool are ready to use
    });

    // it('should calculate gas', async () => {
    //     if (CALCULATE_GAS) {
    //     const REWARDS_DEPOSITS_MAX_COUNT = 75n;  // real is 60
    //     const REWARD_JETTONS_MAX_COUNT = 15n;  // real is 10
    //     const REQUESTS_MAX_COUNT = 20n;  // real is 15
    
    //     rewardJettonsList = Dictionary.empty();
        
    //     for (let i = 0; i < REWARD_JETTONS_MAX_COUNT; ++i) {
    //         let m = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(i, 16).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
    //         await m.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
    //         rewardsJettonMinters.push(m);
    //         creatorRewardsWallets.push(blockchain.openContract(JettonWallet.createFromAddress(await m.getWalletAddress(poolCreator.address))));
    //         poolRewardsWallets.push(blockchain.openContract(JettonWallet.createFromAddress(await m.getWalletAddress(stakingPool.address))));
    //         rewardJettonsList.set(poolRewardsWallets[i].address, false);
    //     }

    //     let transactionRes = await stakingPool.sendAddRewardJettons(poolCreator.getSender(), rewardJettonsList);
    //     printTransactionFees(transactionRes.transactions);
        
    //     let rewardsToAdd = 1000n;
    //     let rewardsCommission = rewardsToAdd * stakingPoolConfig.rewardsCommission / Dividers.COMMISSION_DIVIDER;
    //     let distributionPeriod = 1000
        
    //     // Max add rewards gas: 18384 gas units. Total consumption 0.022 TON + tons::jetton_transfer
    //     // for (let i = 0; i < REWARDS_DEPOSITS_MAX_COUNT; i ++) {
    //     //     transactionRes = await creatorRewardsWallet.sendTransfer(
    //     //         poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
    //     //         StakingPool.addRewardsPayload(blockchain.now!!, blockchain.now!! + distributionPeriod)
    //     //     );
    //     //     console.log(printTransactionFees(transactionRes.transactions))
    //     // }

    //     // v1 -- all deposits in one jetton
    //     for (let i = 0; i < REWARDS_DEPOSITS_MAX_COUNT - REWARD_JETTONS_MAX_COUNT; i ++) {
    //         transactionRes = await creatorRewardsWallet.sendTransfer(
    //             poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
    //             StakingPool.addRewardsPayload(blockchain.now!!, blockchain.now!! + distributionPeriod)
    //         );
    //         expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //         expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});
    //     }
    //     for (let w of creatorRewardsWallets) {
    //         let transactionRes = await w.sendTransfer(
    //             poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
    //             StakingPool.addRewardsPayload(blockchain.now!!, blockchain.now!! + distributionPeriod)
    //         );
    //         expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //         expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});
    //     }

    //     // v2 -- deposits are distributed evenly
    //     // for(let i = 0; i < REWARDS_DEPOSITS_MAX_COUNT / REWARD_JETTONS_MAX_COUNT; i++) {
    //     //     for (let w of creatorRewardsWallets) {
    //     //         let transactionRes = await w.sendTransfer(
    //     //             poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
    //     //             StakingPool.addRewardsPayload(blockchain.now!!, blockchain.now!! + distributionPeriod)
    //     //         );
    //     //     }
    //     // }

    //     expect((await stakingPool.getStorageData()).rewardsDepositsCount).toEqual(REWARDS_DEPOSITS_MAX_COUNT + 1n) // check counter
        
    //     // Max request unstake gas = 16759 + 500012 + 7040 = 524061 gas units. Total consumption = 0.22 TON.
    //     for (let i = 0; i < REQUESTS_MAX_COUNT; ++i) {
    //         blockchain.now!! += 1;
    //         transactionRes = await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), 10n);
    //         expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //         expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});
    //       }
    //     printTransactionFees(transactionRes.transactions);

    //     // Max cancel unstake request gas = 59352 + 500012 + 7040 = 566662 gas units. Total consumption = 0.23 TON.
    //     blockchain.now!! += 1;
    //     let requestsToCancel: Dictionary<number, boolean> = Dictionary.empty();
    //     for (let i = 0; i < REQUESTS_MAX_COUNT; ++i) {
    //         requestsToCancel.set(blockchain.now!! - i - 1, false);
    //     }
    //     transactionRes = await stakeWallet1_1.sendCancelUnstakeRequest(user1.getSender(), requestsToCancel);
    //     printTransactionFees(transactionRes.transactions)
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});

    //     let startUnstakeTime = blockchain.now!!;
    //     for (let i = 0; i < REQUESTS_MAX_COUNT; ++i) {
    //         blockchain.now!! += 1;
    //         transactionRes = await stakeWallet1_1.sendUnstakeRequest(user1.getSender(), 10n);
    //     }

    //     // Max stake gas = 21396 + 13124 + 500012 + 7040 = 541572 gas units. Total consumption = 0.241 TON + tons::jetton_transfer
    //     blockchain.now!! += 1;
    //     let jettonsToStake1 = 40n;
    //     let lockPeriod1 = 60;
    //     let commission1 = 80n;
    //     transactionRes = await user1LockWallet.sendTransfer(
    //         user1.getSender(), jettonsToStake1, stakingPool.address, user1.address, Gas.STAKE_JETTONS,
    //         StakingPool.stakePayload(lockPeriod1)
    //     );
    //     printTransactionFees(transactionRes.transactions);
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});

    //     // New stake wallet deployment is cheaper as it has null rewards dict
    //     transactionRes = await user1LockWallet.sendTransfer(
    //         user1.getSender(), jettonsToStake1, stakingPool.address, user1.address, Gas.STAKE_JETTONS,
    //         StakingPool.stakePayload(60 * 60 * 24)
    //     );
    //     printTransactionFees(transactionRes.transactions);
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});


    //     // Max claim rewards gas = 14887 + 229745 + 7040 = 251672 gas units. Total consumption = 0.275 TON + jettons_to_claim * (tons::jetton_transfer + fwd_fee)
    //     blockchain.now!! += 1;
    //     transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
    //     printTransactionFees(transactionRes.transactions);
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});

    //     // Max send staked jettons gas = 21463 + 24908 + (500012 + 7040) * 2 = 1060475. Total consumption = 0.471 TON + forwad_ton_amount
    //     blockchain.now!! += 1;
    //     transactionRes = await stakeWallet1_1.sendTransfer( 
    //         user1.getSender(), 80n, user2.address, user1.address, toNano(0.1),
    //         beginCell().storeUint(0, 32).storeStringTail("test").endCell()
    //     );
    //     printTransactionFees(transactionRes.transactions);
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});

    //     stakeWallet2_1 = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(user2.address, lockPeriod1))!!));
    //     blockchain.now!! += 1;
    //     transactionRes = await stakeWallet2_1.sendTransfer( 
    //         user2.getSender(), 70n, user1.address, user2.address, toNano(0.1),
    //         beginCell().storeUint(0, 32).storeStringTail("test").endCell()
    //     );
    //     printTransactionFees(transactionRes.transactions);
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});
        
    //     // approximate update_request size
    //     let userRewardsDict = await stakeWallet1_1.getRewardsDict();
    //     let stats = collectCellStats(userRewardsDict, []);
    //     stats.bits += 916 + 124 * Number(REWARD_JETTONS_MAX_COUNT);
    //     stats.cells += 1
    //     console.log(stats)

    //     // Max unstake jettons gas = 57957 + 500012 + 7480 + 7040 = 572747 gas units. Total consumption = 0.254 TON + unstake_fee + tons::jetton_transfer
    //     blockchain.now!! += 1 //lockPeriod1 - (blockchain.now!! - startUnstakeTime + Number(REQUESTS_MAX_COUNT / 2n));
    //     let jettonsToFreeUnstake = 10n * REQUESTS_MAX_COUNT / 2n;
    //     let jettonsToForceUnstake = 430n * 4n / 5n - jettonsToFreeUnstake - 10n;
    //     transactionRes = await stakeWallet1_1.sendUnstakeJettons(user1.getSender(), jettonsToFreeUnstake + jettonsToForceUnstake, true, stakingPoolConfig.unstakeFee);
    //     printTransactionFees(transactionRes.transactions);
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});

    //     // Max claim commissions gas = 10393 gas units. Total consumption = 0.005 + tons::jetton_transfer
    //     transactionRes = await stakingPool.sendClaimCommissions(poolCreator.getSender());
    //     printTransactionFees(transactionRes.transactions);
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: -14});
    //     expect(transactionRes.transactions).not.toHaveTransaction({exitCode: 13});
    //     }
    // });
    
    // it('should send commissions', async () => {
    //     //Transactions chain (in order)
    //     let transactionRes = await stakingPool.sendClaimCommissions(poolCreator.getSender()); // 0
        
    //     expect(transactionRes.transactions).toHaveTransaction({ // 1
    //         from: poolCreator.address,
    //         to: stakingPool.address,
    //         op: OpCodes.CLAIM_COMMISSIONS,
    //         success: true
    //     })
        

    //     expect(transactionRes.transactions).toHaveTransaction({ // 2
    //         from: stakingPool.address,
    //         to: poolLockWallet.address,
    //         op: OpCodes.TRANSFER_JETTON,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 3
    //         from: poolLockWallet.address,
    //         to: creatorLockWallet.address,
    //         op: OpCodes.INTERNAL_TRANSFER,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 4 fails
    //         from: creatorLockWallet.address,
    //         to: poolCreator.address,
    //         op: OpCodes.TRANSFER_NOTIFICATION,
    //         success: false
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 5
    //         from: creatorLockWallet.address,
    //         to: poolCreator.address,
    //         op: OpCodes.EXCESSES,
    //         success: true
    //     })

    //     let creatorLockBalance = await creatorLockWallet.getJettonBalance()
    //     expect(creatorLockBalance).toEqual(90n);
    //     stakingPoolConfig = await stakingPool.getStorageData();
    //     expect(stakingPoolConfig.collectedCommissions).toEqual(0n);
    // });

    // it('should send rewards', async () => {
    //     //////////////////////////////////////////////////////////////////////////////////////////////////////// 1
    //     // Transaction Chain (in order)
    //     let transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList); // 0 ;; next

    //     printTransactionFees(transactionRes.transactions)

    //     stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
    //     let user1RewardsBalance = await user1RewardsWallet.getJettonBalance();

    //     expect(stakeWalletConfig1_1.isActive).toBeTruthy();

    //     expect(transactionRes.transactions).toHaveTransaction({ // 1
    //         from: user1.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.CLAIM_REWARDS
    //     })

    //     const transferTx2 = findTransactionRequired(transactionRes.transactions, {
    //         on: stakingPool.address,
    //         from: stakeWallet1_1.address,
    //         op: OpCodes.SEND_CLAIMED_REWARDS
    //     })

    //     expect(transactionRes.transactions).toHaveTransaction({ // 3
    //         from: stakingPool.address,
    //         to: poolRewardsWallet.address,
    //         op: OpCodes.TRANSFER_JETTON,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 4
    //         from: poolRewardsWallet.address,
    //         to: user1RewardsWallet.address,
    //         op: OpCodes.INTERNAL_TRANSFER,
    //         success: true
    //     })

    //     expect(user1RewardsBalance).toEqual(100n);

    //     expect(transactionRes.transactions).toHaveTransaction({ // 5
    //         from: user1RewardsWallet.address,
    //         to: user1.address,
    //         op: OpCodes.TRANSFER_NOTIFICATION,
    //         success: false
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 6
    //         from: user1RewardsWallet.address,
    //         to: user1.address,
    //         op: OpCodes.EXCESSES,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 7
    //         from: stakingPool.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.UPDATE_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({ // 8
    //         from: stakeWallet1_1.address,
    //         to: user1.address,
    //         op: OpCodes.EXCESSES,
    //         success: true
    //     })
 
    //     //////////////////////////////////////////////////////////////////////////////////////////////////////// 2

    //     blockchain.now!! += 100;
    //     transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
    //     stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
    //     expect(stakeWalletConfig1_1.isActive).toBeTruthy();
    //     user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        
    //     expect(transactionRes.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.CLAIM_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({
    //         from: poolRewardsWallet.address,
    //         to: user1RewardsWallet.address,
    //         op: OpCodes.INTERNAL_TRANSFER,
    //         success: true
    //     })

    //     expect(user1RewardsBalance).toEqual(180n);

    //     //////////////////////////////////////////////////////////////////////////////////////////////////////// 3

    //     blockchain.now!! += 100;
    //     transactionRes = await stakeWallet1_1.sendClaimRewards(user1.getSender(), rewardJettonsList);
    //     stakeWalletConfig1_1 = await stakeWallet1_1.getStorageData();
    //     expect(stakeWalletConfig1_1.isActive).toBeTruthy();
    //     user1RewardsBalance = await user1RewardsWallet.getJettonBalance();
        
    //     expect(transactionRes.transactions).toHaveTransaction({
    //         from: user1.address,
    //         to: stakeWallet1_1.address,
    //         op: OpCodes.CLAIM_REWARDS,
    //         success: true
    //     })
    //     expect(transactionRes.transactions).toHaveTransaction({
    //         from: poolRewardsWallet.address,
    //         to: user1RewardsWallet.address,
    //         op: OpCodes.INTERNAL_TRANSFER,
    //         success: true
    //     })

    //     expect(user1RewardsBalance).toEqual(260n);
        
    // });
    
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
    //     let unstakeCommission = jettonsToForceUnstake * BigInt((stakingPoolConfig.lockPeriods.get(Number(stakeWalletConfig1_1.lockPeriod!!))!!).unstakeCommission) / Dividers.COMMISSION_DIVIDER;

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
    //         to: stakeWallet1_1_OwnerAddress,
    //         op: OpCodes.EXCESSES,
    //         success: true,
    //         value(x) {
    //             return (x! > toNano("0.19"))
    //         },
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

    // it('should update referrer', async () => {
    //     // let transactionRes = await inviteeWallet1.sendRequestUpdateReferrer(user1.getSender(), 100000n, user1.address);
    // });
});
