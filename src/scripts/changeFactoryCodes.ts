import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Deviders, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("kQAQmdFfoK6EmnniQSOvRmx5P7KKMmwnvRo4It_1iQXXRXOK")));
    // await poolFactory.sendSetCode(provider.sender(), await compile("PoolFactory"));
    await poolFactory.sendChangeCodes(provider.sender(), await compile("StakingPool"), await compile("StakeWallet"), await compile("JettonMinter"));
}