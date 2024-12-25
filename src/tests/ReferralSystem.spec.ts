import { Blockchain, SandboxContract, SendMessageResult, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Dictionary, Transaction, TransactionComputeVm, beginCell, storeCurrencyCollection, toNano } from '@ton/core';
import { LockPeriodsValue, RewardJettonsValue, StakingPool, StakingPoolConfig, stakingPoolConfigToCell, stakingPoolInitedData } from '../wrappers/StakingPool';
import { StakeWallet, StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';
import { ReferrerWallet, ReferrerWalletConfig, rewardsRequestDictValueParser } from '../wrappers/ReferrerWallet';
import { InviteeWallet, InviteeWalletConfig } from '../wrappers/InviteeWallet';
import { StakingPoolUninited, StakingPoolUninitedConfig, stakingPoolUninitedConfigToCell } from '../wrappers/StakingPoolUninited';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter as JettonMinterDefault } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { findTransactionRequired, randomAddress } from '@ton/test-utils';
import { Addresses, AddrList, Dividers, Gas, OpCodes } from '../wrappers/imports/constants';
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

    let referrer: SandboxContract<TreasuryContract>;
    let refStakeWallet: SandboxContract<StakeWallet>;
    let refStakeWalletConfig: StakeWalletConfig;
    let referrerWallet: SandboxContract<ReferrerWallet>;

    let invitees: Array<SandboxContract<TreasuryContract>> = [];
    let inviteeWallets: Array<SandboxContract<InviteeWallet>> = [];
    let referrerWallets: Array<SandboxContract<ReferrerWallet>> = [];
    let stakeWallets: Array<SandboxContract<StakeWallet>> = [];

    let jettonMinterDefault: SandboxContract<JettonMinterDefault>;

    let poolLockWallet: SandboxContract<JettonWallet>;
    let refLockWallet: SandboxContract<JettonWallet>;
    let inviteeLockWallets: Array<SandboxContract<JettonWallet>> = [];
    let creatorLockWallet: SandboxContract<JettonWallet>;

    let jettonMinterDefault2: SandboxContract<JettonMinterDefault>;
    let poolRewardsWallet: SandboxContract<JettonWallet>;
    let refRewardsWallet: SandboxContract<JettonWallet>;
    let inviteeRewardsWallets: Array<SandboxContract<JettonWallet>> = [];
    let creatorRewardsWallet: SandboxContract<JettonWallet>;
    let adminRewardsWallet: SandboxContract<JettonWallet>;
    
    let stakingPoolConfig: StakingPoolConfig;
    let referrerWalletConfig: ReferrerWalletConfig;
    let inviteeWalletConfigs: Array<InviteeWalletConfig>;
    let stakeWalletConfigs: Array<StakeWalletConfig>;


    let rewardsJettonMinters: Array<SandboxContract<JettonMinterDefault>> = [];
    let creatorRewardsWallets: Array<SandboxContract<JettonWallet>> = [];

    let rewardJettonsList: AddrList;
    let transactionRes: SendMessageResult;

    const publicKey = Buffer.from("6580630b8e03d33193195e28fa60cff750c608dbb8a2dd9f1196425b353ee2c8", 'hex');
    const privateKey = Buffer.from("a697139dab71a6ec0e2abf3232c4ebe2ba5c383c18a0229e9e3705aacfa3d9c96580630b8e03d33193195e28fa60cff750c608dbb8a2dd9f1196425b353ee2c8", 'hex');
    
    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting;
        
        poolAdmin = await blockchain.treasury('poolAdmin');
        poolCreator = await blockchain.treasury('poolCreator');
        referrer = await blockchain.treasury('user1');
        invitees = [];
        for (let i = 2; i < 5; i++) {
            invitees.push(await blockchain.treasury(`user${i}`));
        }
        
        stakingPool = blockchain.openContract(StakingPool.createFromConfig({poolId: 1n, factoryAddress: poolAdmin.address}, stakingPoolUninitedCode));

        jettonMinterDefault = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: Cell.EMPTY, wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        await jettonMinterDefault.sendMint(poolAdmin.getSender(), referrer.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        for (let invitee of invitees) {
            await jettonMinterDefault.sendMint(poolAdmin.getSender(), invitee.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        }
        refLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(referrer.address)));
        inviteeLockWallets = [];
        for (let invitee of invitees) {
            inviteeLockWallets.push(blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(invitee.address))));
        }

        creatorLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(poolCreator.address)));
        poolLockWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault.getWalletAddress(stakingPool.address)));
        jettonMinterDefault2 = blockchain.openContract(JettonMinterDefault.createFromConfig({admin: poolAdmin.address, content: beginCell().storeUint(0, 32).endCell(), wallet_code: jettonWalletCode}, jettonMinterDefaultCode));
        // await jettonMinterDefault2.sendMint(poolAdmin.getSender(), user1.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        await jettonMinterDefault2.sendMint(poolAdmin.getSender(), poolCreator.address, toNano(1000), toNano("0.2"), toNano("0.5"));
        refRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(referrer.address)));
        inviteeRewardsWallets = [];
        for (let invitee of invitees) {
            inviteeRewardsWallets.push(blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(invitee.address))));
        }
        creatorRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolCreator.address)));
        poolRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(stakingPool.address)));
        adminRewardsWallet = blockchain.openContract(JettonWallet.createFromAddress(await jettonMinterDefault2.getWalletAddress(poolAdmin.address)));

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        let lockPeriods: Dictionary<number, LockPeriodsValue> = Dictionary.empty();
        let minterAddr1 = randomAddress(0);
        let minterAddr2 = randomAddress(0);
        let minterAddr3 = randomAddress(0);
        lockPeriods.set(60, {curTvl: 0n, tvlLimit: 200000n, rewardMultiplier: 1 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: minterAddr1});
        lockPeriods.set(120, {curTvl: 0n, tvlLimit: 200000n, rewardMultiplier: 2 * Dividers.REWARDS_DIVIDER, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: minterAddr2});
        lockPeriods.set(60 * 60 * 24, {curTvl: 0n, tvlLimit: 1000000n, rewardMultiplier: 10, depositCommission: Math.round(0.2 * Number(Dividers.COMMISSION_DIVIDER)), unstakeCommission: Math.round(0.1 * Number(Dividers.COMMISSION_DIVIDER)), minterAddress: minterAddr3});
        let whitelist: AddrList = Dictionary.empty();
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

        // Deploy staking pool
        transactionRes = await stakingPool.sendDeploy(poolAdmin.getSender(), toNano('0.1'), stakingPoolConfig, stakingPoolCode);

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
        
        // Add reward jetton
        rewardJettonsList = Dictionary.empty();

        rewardJettonsList.set(poolRewardsWallet.address, false)

        transactionRes = await stakingPool.sendAddRewardJettons(poolCreator.getSender(), rewardJettonsList);
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolCreator.address,
            to: stakingPool.address,
            op: OpCodes.ADD_REWARD_JETTONS,
            success: true
        });

        // Add rewards
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
        
        // Deploy referrer wallet
        referrerWalletConfig = {
            ownerAddress: referrer.address,
            revenueShare: Number(Dividers.REVENUE_SHARE_DIVIDER) * 0.05,
            poolsDict: Dictionary.empty(),
            inviteeWalletCode: inviteeWalletCode,
        }
        referrerWallet = blockchain.openContract(ReferrerWallet.createFromConfig(referrerWalletConfig, referrerWalletCode));
        transactionRes = await referrerWallet.sendDeploy(referrer.getSender(), referrerWalletConfig.ownerAddress, referrerWalletConfig.revenueShare, inviteeWalletCode, privateKey);
        expect(transactionRes.transactions).toHaveTransaction({
            from: referrer.address,
            to: referrerWallet.address,
            success: true,
            deploy: true
        });
        referrerWalletConfig = await referrerWallet.getStorageData();
        expect(referrerWalletConfig.ownerAddress.toString()).toEqual(referrer.address.toString());
        expect(referrerWalletConfig.revenueShare).toEqual(Number(Dividers.REVENUE_SHARE_DIVIDER) * 0.05);
        expect(referrerWalletConfig.inviteeWalletCode.hash().toString('hex')).toEqual(inviteeWalletCode.hash().toString('hex'));

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
        // Stake jettons 
        let jettonsToStake1 = 40000n;
        let lockPeriod1 = 60;
        let commission1 = 8000n;
        refStakeWallet = blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(referrer.address, lockPeriod1))!!));
        transactionRes = await refLockWallet.sendTransfer(
            referrer.getSender(), jettonsToStake1, stakingPool.address, referrer.address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod1)
        );
        let poolLockBalance = await poolLockWallet.getJettonBalance()
        refStakeWalletConfig = await refStakeWallet.getStorageData();
        expect(refStakeWalletConfig.isActive).toBeTruthy();
        expect(refStakeWalletConfig.jettonBalance).toEqual(jettonsToStake1 - commission1);
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPool are ready to use
    });

    it('should accept deposit & claim rewards', async () => {
        let jettonsToStake1 = 40000n;
        let commission1 = 8000n;
        let distributionPeriod = 1000;
        let rewardsToAdd = 100000n;

        // Make deposit
        blockchain.now!! += distributionPeriod / 10;
        let jettonsToStake2 = 5000n;
        let lockPeriod2 = 120;
        let commission2 = 1000n;
        transactionRes = await inviteeLockWallets[0].sendTransfer(
            invitees[0].getSender(), jettonsToStake2, stakingPool.address, invitees[0].address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod2, referrer.address)
        );        
        stakeWallets.push(blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(invitees[0].address, lockPeriod2))!!)));
        let referrerBalance = 2n * (jettonsToStake2 - commission2) * BigInt(referrerWalletConfig.revenueShare) / Dividers.REVENUE_SHARE_DIVIDER;
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakeWallets[0].address,
            to: invitees[0].address,
            op: OpCodes.EXCESSES
        });

        // Check staking pool
        let poolLockBalance = await poolLockWallet.getJettonBalance()
        expect(poolLockBalance).toEqual(jettonsToStake1 + jettonsToStake2); // 40000n + 5000n = 45000n
        stakingPoolConfig = await stakingPool.getStorageData();
        let tmp = stakingPoolConfig.rewardJettons!!.get(poolRewardsWallet.address)!!;
        expect(tmp.distributedRewards).toEqual(Dividers.DISTRIBUTED_REWARDS_DIVIDER * rewardsToAdd / (10n * (jettonsToStake1 - commission1)));
        expect(tmp.rewardsDeposits.get(0)).toEqual({distributionSpeed: Dividers.DISTRIBUTION_SPEED_DIVIDER * 100n, startTime: blockchain.now, endTime: blockchain.now!! - 100 + distributionPeriod});
        expect(stakingPoolConfig.tvl).toEqual(jettonsToStake1 - commission1 + jettonsToStake2 - commission2);
        expect(stakingPoolConfig.tvlWithMultipliers).toEqual(jettonsToStake1 - commission1 + (jettonsToStake2 - commission2) * 2n + referrerBalance);
        expect(stakingPoolConfig.collectedCommissions).toEqual(commission1 + commission2);
 
        // Check invitee wallet
        let inviteeStakeWalletConfig = await stakeWallets[0].getStorageData();
        expect(inviteeStakeWalletConfig.isActive).toBeTruthy();
        expect(inviteeStakeWalletConfig.jettonBalance).toEqual(jettonsToStake2 - commission2);
        
        // Check referrer wallet
        referrerWalletConfig = await referrerWallet.getStorageData();
        let poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        expect(poolInfo.hasPendingRequest).toEqual(false);
        expect(poolInfo.pendingChange).toEqual(0n);
        let rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.distributedRewards).toEqual(tmp.distributedRewards);
        expect(rewardsDictValue.unclaimedRewards).toEqual(0n);
        
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Claim rewards
        blockchain.now!! += distributionPeriod / 10;
        let balanceBefore = await refRewardsWallet.getJettonBalance();
        let rewardsToClaim = Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Dictionary(Dictionary.Keys.Address(), Dictionary.Values.Bool()));
        let tmp1 = Dictionary.empty(Dictionary.Keys.Address(), Dictionary.Values.Bool());
        tmp1.set(poolRewardsWallet.address, false);
        rewardsToClaim.set(1, tmp1);
        transactionRes = await referrerWallet.sendClaimRewards(referrer.getSender(), rewardsToClaim);
        expect(transactionRes.transactions).toHaveTransaction({
            from: referrerWallet.address,
            to: stakingPool.address,
            op: OpCodes.SEND_REFERRER_REWARDS,
            success: true
        });
        expect(transactionRes.transactions).toHaveTransaction({
            from: referrerWallet.address,
            to: referrer.address,
            op: OpCodes.EXCESSES,
            success: true
        });
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakingPool.address,
            to: poolRewardsWallet.address,
            op: OpCodes.TRANSFER_JETTON,
            success: true
        });
        expect(transactionRes.transactions).toHaveTransaction({
            from: stakingPool.address,
            to: referrerWallet.address,
            op: OpCodes.UPDATE_REFERRER,
            success: true
        });
        expect(transactionRes.transactions).toHaveTransaction({
            from: referrerWallet.address,
            to: referrer.address,
            op: OpCodes.EXCESSES,
            success: true
        });
        
        // check referrer wallet
        let expectedRewards = rewardsToAdd * referrerBalance / (10n * stakingPoolConfig.tvlWithMultipliers);
        expect(expectedRewards).toEqual(await refRewardsWallet.getJettonBalance() - balanceBefore);
        referrerWalletConfig = await referrerWallet.getStorageData();
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        expect(poolInfo.hasPendingRequest).toEqual(false);
        expect(poolInfo.pendingChange).toEqual(0n);
        rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.distributedRewards).toEqual(tmp.distributedRewards + Dividers.DISTRIBUTED_REWARDS_DIVIDER * rewardsToAdd / (10n * stakingPoolConfig.tvlWithMultipliers))
        expect(rewardsDictValue.unclaimedRewards).toEqual(0n);
        let prevDistributedRewards = rewardsDictValue.distributedRewards;
        let prevTvlWithMultipliers = stakingPoolConfig.tvlWithMultipliers;

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Send unstake request
        blockchain.now!! += distributionPeriod / 10;
        transactionRes = await stakeWallets[0].sendUnstakeRequest(invitees[0].getSender(), inviteeStakeWalletConfig.jettonBalance / 2n);
        referrerBalance /= 2n;

        // Check staking pool
        stakingPoolConfig = await stakingPool.getStorageData();
        expect(stakingPoolConfig.tvlWithMultipliers).toEqual(prevTvlWithMultipliers - referrerBalance - inviteeStakeWalletConfig.jettonBalance);
        tmp = stakingPoolConfig.rewardJettons!!.get(poolRewardsWallet.address)!!;
        expect(tmp.distributedRewards / 10n).toEqual((prevDistributedRewards + Dividers.DISTRIBUTED_REWARDS_DIVIDER * rewardsToAdd / (10n * prevTvlWithMultipliers)) / 10n);
        prevTvlWithMultipliers = stakingPoolConfig.tvlWithMultipliers
        prevDistributedRewards = tmp.distributedRewards;


        // Check referrer wallet
        referrerWalletConfig = await referrerWallet.getStorageData();
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        expect(poolInfo.hasPendingRequest).toEqual(false);
        expect(poolInfo.pendingChange).toEqual(0n);
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.distributedRewards).toEqual(tmp.distributedRewards);
        expect(rewardsDictValue.unclaimedRewards).toEqual(expectedRewards);

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Claim rewards again
        blockchain.now!! += distributionPeriod / 10;
        balanceBefore = await refRewardsWallet.getJettonBalance();
        transactionRes = await referrerWallet.sendClaimRewards(referrer.getSender(), rewardsToClaim);
        expectedRewards = rewardsDictValue.unclaimedRewards + rewardsToAdd * referrerBalance / (10n * stakingPoolConfig.tvlWithMultipliers);
        expect(expectedRewards).toEqual(await refRewardsWallet.getJettonBalance() - balanceBefore);
        referrerWalletConfig = await referrerWallet.getStorageData();
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        expect(poolInfo.hasPendingRequest).toEqual(false);
        expect(poolInfo.pendingChange).toEqual(0n);
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.unclaimedRewards).toEqual(0n);
        
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Accept deposit from a different invitee
        blockchain.now!! += distributionPeriod / 10;
        let jettonsToStake3 = jettonsToStake2 / 2n * 3n;
        let lockPeriod3 = lockPeriod2;
        let commission3 = 1500n;
        transactionRes = await inviteeLockWallets[1].sendTransfer(
            invitees[1].getSender(), jettonsToStake3, stakingPool.address, invitees[1].address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod3, referrer.address)
        );
        stakeWallets.push(blockchain.openContract(StakeWallet.createFromAddress((await stakingPool.getWalletAddress(invitees[1].address, lockPeriod2))!!)));
        referrerBalance += referrerBalance * 3n;

        // Check staking pool
        stakingPoolConfig = await stakingPool.getStorageData();
        expect(stakingPoolConfig.tvlWithMultipliers).toEqual(prevTvlWithMultipliers + (jettonsToStake3 - commission3) * 2n * (Dividers.REVENUE_SHARE_DIVIDER + BigInt(referrerWalletConfig.revenueShare)) / Dividers.REVENUE_SHARE_DIVIDER);
        tmp = stakingPoolConfig.rewardJettons!!.get(poolRewardsWallet.address)!!;
        expect(tmp.distributedRewards / 10n).toEqual((prevDistributedRewards + Dividers.DISTRIBUTED_REWARDS_DIVIDER * rewardsToAdd / (5n * prevTvlWithMultipliers)) / 10n);
        
        // Check referrer wallet
        referrerWalletConfig = await referrerWallet.getStorageData();
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        expect(poolInfo.hasPendingRequest).toEqual(false);
        expect(poolInfo.pendingChange).toEqual(0n);
        rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.distributedRewards).toEqual(tmp.distributedRewards);
        expect(rewardsDictValue.unclaimedRewards).toEqual(rewardsToAdd * referrerBalance / 4n / (10n * prevTvlWithMultipliers));
        
        let prevUnclaimedRewards = rewardsDictValue.unclaimedRewards;
        prevTvlWithMultipliers = stakingPoolConfig.tvlWithMultipliers
        prevDistributedRewards = tmp.distributedRewards;
        
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
       
        // instant unstake
        blockchain.now!! += distributionPeriod / 10;
        transactionRes = await stakeWallets[1].sendUnstakeJettons(invitees[1].getSender(), jettonsToStake3 - commission3, true, stakingPoolConfig.unstakeFee);
        referrerBalance /= 4n;

        // Check staking pool
        stakingPoolConfig = await stakingPool.getStorageData();
        expect(stakingPoolConfig.tvlWithMultipliers).toEqual(prevTvlWithMultipliers - (jettonsToStake3 - commission3) * 2n - referrerBalance * 3n);
        tmp = stakingPoolConfig.rewardJettons!!.get(poolRewardsWallet.address)!!;
        expect(tmp.distributedRewards / 10n).toEqual((prevDistributedRewards + Dividers.DISTRIBUTED_REWARDS_DIVIDER * rewardsToAdd / (10n * prevTvlWithMultipliers)) / 10n);

        // Check referrer wallet
        referrerWalletConfig = await referrerWallet.getStorageData();
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        expect(poolInfo.hasPendingRequest).toEqual(false);
        expect(poolInfo.pendingChange).toEqual(0n);
        rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.distributedRewards).toEqual(tmp.distributedRewards);
        expect(rewardsDictValue.unclaimedRewards).toEqual(prevUnclaimedRewards + rewardsToAdd * referrerBalance * 4n / (10n * prevTvlWithMultipliers));
        prevTvlWithMultipliers = stakingPoolConfig.tvlWithMultipliers
        prevDistributedRewards = tmp.distributedRewards;
        prevUnclaimedRewards = rewardsDictValue.unclaimedRewards;

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // upgrade referrer wallet
        const newRevenueShare = Math.ceil(referrerWalletConfig.revenueShare * 3 / 2);
        transactionRes = await referrerWallet.sendUpgradeReferrerWallet(referrer.getSender(), newRevenueShare, referrer.address, blockchain.now!!, privateKey);
        printTransactionFees(transactionRes.transactions);
        expect(transactionRes.transactions).toHaveTransaction({
            from: referrerWallet.address,
            to: referrer.address,
            op: OpCodes.EXCESSES,
        });
        expect(transactionRes.transactions).toHaveTransaction({
            from: referrerWallet.address,
            to: Addresses.FACTORY_ADDRESS,
            op: OpCodes.EXCESSES,
            value(x) {
                return x!! > toNano('0.049') && x!! < toNano('0.05');
            },
        });
        referrerWalletConfig = await referrerWallet.getStorageData();
        expect(referrerWalletConfig.revenueShare).toEqual(newRevenueShare);
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        expect(poolInfo.pendingChange).toEqual(referrerBalance / 2n);

        blockchain.now!! += distributionPeriod / 10;
        transactionRes = await inviteeLockWallets[1].sendTransfer(
            invitees[1].getSender(), jettonsToStake3, stakingPool.address, invitees[1].address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod3, referrer.address)
        );  
        // printTransactionFees(transactionRes.transactions);
        referrerWalletConfig = await referrerWallet.getStorageData();
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.unclaimedRewards).toEqual(prevUnclaimedRewards + rewardsToAdd * referrerBalance / (10n * prevTvlWithMultipliers));
        prevUnclaimedRewards = rewardsDictValue.unclaimedRewards;
        stakingPoolConfig = await stakingPool.getStorageData();
        prevTvlWithMultipliers = stakingPoolConfig.tvlWithMultipliers
        prevDistributedRewards = tmp.distributedRewards;
        referrerBalance = 2n * (jettonsToStake3 - commission3) * BigInt(newRevenueShare) / Dividers.REVENUE_SHARE_DIVIDER + referrerBalance * 3n / 2n;
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance);
        
        blockchain.now!! += distributionPeriod / 10;
        transactionRes = await inviteeLockWallets[1].sendTransfer(
            invitees[1].getSender(), jettonsToStake3, stakingPool.address, invitees[1].address, Gas.STAKE_JETTONS,
            StakingPool.stakePayload(lockPeriod3, referrer.address)
        );
        referrerWalletConfig = await referrerWallet.getStorageData();
        poolInfo = referrerWalletConfig.poolsDict!!.get(1)!!;
        rewardsDictValue = poolInfo.rewardsDict!!.get(poolRewardsWallet.address)!!;
        expect(rewardsDictValue.unclaimedRewards).toEqual(prevUnclaimedRewards + rewardsToAdd * referrerBalance / (10n * prevTvlWithMultipliers));
        expect(poolInfo.inviteesBalance).toEqual(referrerBalance + 2n * (jettonsToStake3 - commission3) * BigInt(newRevenueShare) / Dividers.REVENUE_SHARE_DIVIDER);

    });
});