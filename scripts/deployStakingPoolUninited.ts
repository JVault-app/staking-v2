import { toNano } from '@ton/core';
import { StakingPoolUninited } from '../wrappers/StakingPoolUninited';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const stakingPoolUninited = provider.open(StakingPoolUninited.createFromConfig({}, await compile('StakingPoolUninited')));

    await stakingPoolUninited.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(stakingPoolUninited.address);

    // run methods on `stakingPoolUninited`
}
