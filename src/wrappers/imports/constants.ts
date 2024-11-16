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
    
    // management
    SEND_ANY_MESSAGE:        0xa47d989c,
    SET_CODE:                0xe2d2d211,
    WITHDRAW_TON:            0x37726bdb,
    SEND_WITHDRAW_TON:       0xe5b8268f,
    WITHDRAW_JETTON:         0x11c09682,
    DEACTIVATE_WALLET:       0x4b14c485,

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
    CHANGE_CREATION_FEE:   0x66D5528B,
    CHANGE_CONTENT:        0x0ec29200,
    UPDATE_CODES:          0x85c923cf,
};

export const Gas = {
    MIN_RESERVE:            20000000n,  
    DEPLOY_POOL:            340000000n, 
    NOTIFICATION:           340000000n, 
    JETTON_TRANSFER:        55000000n,   
    BURN_JETTONS:           340000000n,   
    STAKE_JETTONS:          340000000n,  
    UNSTAKE_JETTONS:        340000000n, 
    CANCEL_UNSTAKE:         340000000n, 
    SEND_COMMISSIONS:       340000000n,
    SIMPLE_UPDATE_REQUEST:  340000000n,
    ADD_REWARDS:            340000000n,
    APPROVE_TRANSFER:       340000000n,
    SAVE_UPDATED_REWARDS:   340000000n,
    MIN_EXCESS:             10000000n,
    SEND_STAKED_JETTONS:    550000000n,
}

export type AddrList = Dictionary<Address, Boolean>;

export const Dividers = {
    COMMISSION_DIVIDER: 10000n,
    REWARDS_DIVIDER: 1000,
    DISTRIBUTION_SPEED_DIVIDER: BigInt(24 * 60 * 60),
    DISTRIBUTED_REWARDS_DIVIDER: 100000000000000000000000000000000000000n,
}
