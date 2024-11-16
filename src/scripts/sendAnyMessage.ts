import { Address, beginCell, Cell, Dictionary, toNano } from '@ton/core';
import { PeriodsDeployValue, PoolFactory, PoolFactoryConfig } from '../wrappers/PoolFactory';
import { compile, NetworkProvider } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { Dividers, Gas } from '../wrappers/imports/constants';
import { LockPeriodsValue, StakingPool, StakingPoolConfig, stakingPoolConfigToCell, stakingPoolInitedData } from '../wrappers/StakingPool';
import { JettonMinter } from '../wrappers/JettonMinterDefault';
import { JettonWallet } from '../wrappers/JettonWallet';
import { buildOnchainMetadata } from '../wrappers/imports/buildOnchain';


export async function run(provider: NetworkProvider) {
    const poolFactory = provider.open(PoolFactory.createFromAddress(Address.parse("kQDbVcYqi4vPL_h37o4p-syYSIridQzotg_asck57ziU1JLY")));
    const walletAddress = Address.parse("EQCdpzoFTnPKgo2VhmbNmxq521iWMZt5kTb4OSRoqJccPW-d")
    const sendPayload = StakingPool.sendAnyMessageMessage(walletAddress, Cell.fromBase64("te6cckEBAQEALQAAVdaKSsEX9gblW2sAflBKgXyABp8pXNXwAAD6QR4aMAMCvrDCA78ocZDuOXyubVCx"))
    await poolFactory.sendSendAnyMessage(provider.sender(), toNano("0.4"), Address.parse("EQCqXC2ctGm-y4dDEseavJ2mwuZMksEI_jGi8msA2BNM19Br"), sendPayload); //stakingPoolInitedData(stakingPoolConfig));
}