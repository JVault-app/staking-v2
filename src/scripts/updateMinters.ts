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
    const stakingPool = provider.open(StakingPool.createFromAddress(Address.parse("EQCqXC2ctGm-y4dDEseavJ2mwuZMksEI_jGi8msA2BNM19Br"))) //
    const stakingJettonMinterAddress = Address.parse("EQCHw6pHLU6NAzrNZmfD9vMhcQK9g9Qmo3M8m1tqvqdGQvGi")

    let transactionRes = await stakingPool.sendGetStorageData(
        provider.sender(), toNano("0.1"), stakingJettonMinterAddress, beginCell().storeUint(0, 32).endCell()
    );
}
