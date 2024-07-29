// import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
// import { Cell, toNano } from '@ton/core';
// import { StakingPool } from '../wrappers/StakingPool';
// import '@ton/test-utils';
// import { compile } from '@ton/blueprint';

// describe('StakingPool', () => {
//     let code: Cell;

//     beforeAll(async () => {
//         code = await compile('StakingPool');
//     });

//     let blockchain: Blockchain;
//     let deployer: SandboxContract<TreasuryContract>;
//     let stakingPool: SandboxContract<StakingPool>;

//     beforeEach(async () => {
//         blockchain = await Blockchain.create();

//         stakingPool = blockchain.openContract(StakingPool.createFromConfig({}, code));

//         deployer = await blockchain.treasury('deployer');

//         const deployResult = await stakingPool.sendDeploy(deployer.getSender(), toNano('0.05'));

//         expect(deployResult.transactions).toHaveTransaction({
//             from: deployer.address,
//             to: stakingPool.address,
//             deploy: true,
//             success: true,
//         });
//     });

//     it('should deploy', async () => {
//         // the check is done inside beforeEach
//         // blockchain and stakingPool are ready to use
//     });
// });
