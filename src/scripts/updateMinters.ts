import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider, sleep } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';
import { printTransactionFees } from '@ton/sandbox';
import { getSeqno } from './helpers';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const lastPoolId = Number((await poolFactory.getStorageData()).nextPoolId) - 1;
    const excludedIndexes = [0, 5, 6, 12, 21];
    let curSeqno = await getSeqno(provider);
    for (let i = 1; i <= lastPoolId; i ++) {
        if (!excludedIndexes.includes(i)) {
            const poolAddress = await poolFactory.getNftAddressByIndex(i);
            const stakingPool = provider.open(StakingPool.createFromAddress(poolAddress))
            const lockPeriods = (await stakingPool.getStorageData()).lockPeriods;
            if (lockPeriods.values().length != 1 && i < 23) {
                continue
            }
            for (let periodData of lockPeriods.values()) {
                const jettonMinter = provider.open(JettonMinter.createFromAddress(periodData.minterAddress));
                const prevTvl = await jettonMinter.getTotalSupply();
                if ((!prevTvl && periodData.curTvl) || (prevTvl && Math.abs(Number(periodData.curTvl - prevTvl) / Number(prevTvl)) > 0.1)) {
                    console.log(`Updating ${jettonMinter.address}; prev TVL = ${prevTvl / 1000000000n}; new TVL = ${periodData.curTvl / 1000000000n}`);
                    // await sleep(5000);
                    try {
                        await stakingPool.sendGetStorageData(provider.sender(), toNano("0.04"), jettonMinter.address, beginCell().storeUint(0, 32).endCell());
                        while (curSeqno == await getSeqno(provider)) {
                            await sleep(1000);
                        }
                        curSeqno = await getSeqno(provider);
                        console.log(`transaction ${i} confirmed`)
                    }
                    catch {
                        console.log('transaction rejected')
                    }
                }
                else {
                    console.log(`Skip updating ${jettonMinter.address}; TVL = ${prevTvl / 1000000000n}`)
                }
            }
        }
    }
}
