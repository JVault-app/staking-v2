import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("EQAYS3AO2NaFr5-wl1CU8QMiCxrP0OEXYn82iqnuST9FKo9I")));
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("UQCqXC2ctGm-y4dDEseavJ2mwuZMksEI_jGi8msA2BNM142u")));
    // const jettonWalletAddress = Address.parse("")
    // await poolFactory.sendSetCode(provider.sender(), await compile("PoolFactory"));
    await poolFactory.sendWithdrawTon(provider.sender());
    // await poolFactory.sendSendWithdrawTon(provider.sender(), stakingPool.address);
    // await poolFactory.sendSendWithdrawJettons(provider.sender(), stakingPool.address, jettonWalletAddress, 0n)
}