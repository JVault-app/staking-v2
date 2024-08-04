import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Address, Cell, Dictionary, beginCell, toNano } from '@ton/core';
import { LockPeriodsValue, RewardJettonsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { StakeWallet, StakeWalletConfig, userRewardsDictValueParser } from '../wrappers/StakeWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter as JettonMinterDefault } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { randomAddress } from '@ton/test-utils';
import { AddrList, Deviders, Gas } from '../wrappers/imports/constants';
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
    let stakeWallet1: SandboxContract<StakeWallet>;
    let user2: SandboxContract<TreasuryContract>;
    let stakeWallet2: SandboxContract<StakeWallet>;

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
    let stakeWallet1Config: StakeWalletConfig;
    let stakeWallet2Config: StakeWalletConfig;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = nowSetting
        
        poolAdmin = await blockchain.treasury('poolAdmin');
        poolCreator = await blockchain.treasury('poolCreator');
        user1 = await blockchain.treasury('poolAdmin');
        user2 = await blockchain.treasury('poolAdmin');
        
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
        lockPeriods.set(60, {curTvl: 0n, tvlLimit: 100n, rewardMultiplier: 1, minterAddress: randomAddress(0)});
        lockPeriods.set(120, {curTvl: 0n, tvlLimit: 10n, rewardMultiplier: 2, minterAddress: randomAddress(0)});
        lockPeriods.set(60 * 60 * 24, {curTvl: 0n, tvlLimit: 100000n, rewardMultiplier: 10, minterAddress: randomAddress(0)});
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

        let transactionRes = await stakingPool.sendDeploy(poolAdmin.getSender(), toNano('0.05'), stakingPoolConfig, stakingPoolCode);

        expect(transactionRes.transactions).toHaveTransaction({
            from: poolAdmin.address,
            to: stakingPool.address,
            deploy: true,
            success: true,
        });

        const rewardJettonsList: AddrList = Dictionary.empty();
        rewardJettonsList.set(poolRewardsWallet.address, false);
        transactionRes = await stakingPool.sendAddRewardJettons(poolCreator.getSender(), rewardJettonsList);
        expect(transactionRes.transactions).toHaveTransaction({
            from: poolCreator.address,
            to: stakingPool.address,
            success: true
        });

        let rewardsToAdd = 1000n;
        let rewardsCommission = rewardsToAdd * stakingPoolConfig.rewardsCommission / Deviders.COMMISSION_DEVIDER;
        let distributionPeriod = 1000
        transactionRes = await creatorRewardsWallet.sendTransfer(
            poolCreator.getSender(), rewardsToAdd + rewardsCommission, stakingPool.address, poolCreator.address, Gas.ADD_REWARDS,
            StakingPool.addRewardsPayload(nowSetting, nowSetting + distributionPeriod)
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

        stakingPoolConfig = await stakingPool.getStorageData();
        let tmp = stakingPoolConfig.rewardJettons.get(poolRewardsWallet.address);
        expect(tmp?.distributedRewards).toEqual(0n);
        expect(tmp?.rewardsDeposits.get(0)).toEqual({farmingSpeed: Deviders.FARMING_SPEED_DEVIDER, startTime: nowSetting, endTime: nowSetting + distributionPeriod});
    });

    it('should deploy and add rewards', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPool are ready to use
    });

});
