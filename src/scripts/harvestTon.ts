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
import { getSeqno, lastBlockSeqno } from './helpers';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const lastPoolId = Number((await poolFactory.getStorageData()).nextPoolId) - 1;
    const excludedIndexes = [5, 6, 12, 16];
    let curSeqno = await getSeqno(provider);
    let totalBalance = 0n;
    for (let i = 0; i <= lastPoolId; i ++) {
        if (!excludedIndexes.includes(i)) {
            const poolAddress = await poolFactory.getNftAddressByIndex(i);
            const stakingPool = provider.open(StakingPool.createFromAddress(poolAddress))
            const poolBalance = BigInt((await provider.api().getAccountLite(await lastBlockSeqno(provider), poolAddress)).account.balance.coins);
            if (poolBalance >= toNano("0.1")) {
                totalBalance += poolBalance;
                console.log(`Harvest ${Number(poolBalance) / 1e9} from ${poolAddress} (poolId = ${i});`);
                try {
                    await poolFactory.sendSendWithdrawTon(provider.sender(), poolAddress);
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
        }
    }
    await sleep(15000);
    await poolFactory.sendWithdrawTon(provider.sender()); 
    console.log(`Total balance: ${Number(totalBalance) / 1e9}`);
}
