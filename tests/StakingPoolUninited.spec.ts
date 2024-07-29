import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { StakingPoolUninited } from '../wrappers/StakingPoolUninited';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('StakingPoolUninited', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('StakingPoolUninited');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let stakingPoolUninited: SandboxContract<StakingPoolUninited>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        stakingPoolUninited = blockchain.openContract(StakingPoolUninited.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await stakingPoolUninited.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: stakingPoolUninited.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and stakingPoolUninited are ready to use
    });
});
