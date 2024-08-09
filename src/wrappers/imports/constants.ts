import { Address, Dictionary } from "@ton/core";

export const OpCodes = {
    GET_STATIC_DATA:         0X2FCB26A2,
    REPORT_STATIC_DATA:      0X8B771735,
    GET_STORAGE_DATA:        0X5B88E5CC,
    REPORT_STORAGE_DATA:     0XAAB4A8EF,
    EXCESSES:                0XD53276DB,
    
    // Jettons,
    TRANSFER_JETTON:         0X0F8A7EA5,
    INTERNAL_TRANSFER:       0X178D4519,
    TRANSFER_NOTIFICATION:   0X7362D09C,
    PROVIDE_WALLET_ADDRESS:  0X2C76B973,
    TAKE_WALLET_ADDRESS:     0XD1735400,
    BURN_JETTON:             0X595F07BC,
    
    // Staking pool,
    STAKE_JETTONS:           0XE3A06989,
    ADD_REWARDS:             0XDB16AC95,
    SEND_CLAIMED_REWARDS:    0X44BC1FE3,
    SEND_UNSTAKED_JETTONS:   0XFB232BC3,
    APPROVE_STAKE:           0X919DE781,
    CANCEL_STAKE:            0X9EADA1D9,
    ADD_REWARD_JETTONS:      0X10676AE7,
    CLAIM_COMMISSIONS:       0XBCA8F067,
    REQUEST_UPDATE_REWARDS:  0XF5C5BAA3,
    
    // Staked jetton wallet,
    CLAIM_REWARDS:           0X78D9F109,
    RECEIVE_JETTONS:         0XD68A4AC1,
    UNSTAKE_JETTONS:         0X499A9262,
    UNSTAKE_REQUEST:         0X0168D4B7,
    CANCEL_UNSTAKE_REQUEST:  0XA4910F1A,
    UPDATE_REWARDS:          0XAE9307CE,
    CONFIRM_TRANSFER:        0XBC85EB11,
    
    // Pools admin,
    DEPLOY_NEW_POOL:       0XDA861F17,
    SEND_COMMISSIONS:      0XB96ADAEA,
    SET_CODE:              0xe2d2d211,
    CHANGE_CREATION_FEE:   0x66D5528B,
    CHANGE_CONTENT:        0x0ec29200
};

export const Gas = {
    MIN_RESERVE:            20000000n,   // 0.02  TON
    DEPLOY_POOL:            120000000n,  // 0.12  TON
    NOTIFICATION:           10000000n,   // 0.01  TON
    JETTON_TRANSFER:        55000000n,   // 0.055 TON
    BURN_JETTONS:           50000000n,   // 0.05  TON
    STAKE_JETTONS:          155000000n,  // 0.155 TON
    UNSTAKE_JETTONS:        155000000n,  // 0.155 TON
    CANCEL_UNSTAKE:         110000000n,  // 0.11  TON
    SEND_COMMISSIONS:       120000000n,  // 0.12  TON
    SIMPLE_UPDATE_REQUEST:  100000000n,  // 0.1   TON
    ADD_REWARDS:            65000000n,   // 0.065 TON
    APPROVE_TRANSFER:       20000000n,   // 0.02  TON
    SAVE_UPDATED_REWARDS:   10000000n,   // 0.01  TON
    MIN_EXCESS:             10000000n,   // 0.01  TON
    SEND_STAKED_JETTONS:    250000000n,  // 0.25  TON
}

export type AddrList = Dictionary<Address, Boolean>;

export const Deviders = {
    COMMISSION_DEVIDER: 100000n,
    REWARDS_DEVIDER: 1000,
    FARMING_SPEED_DEVIDER: BigInt(24 * 60 * 60),
    DISTRIBUTED_REWARDS_DEVIDER: 100000000000000000000000000000000000000n,
}
