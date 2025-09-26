use anchor_lang::prelude::*;
use anchor_spl::token::{
    self, 
    CloseAccount, Transfer
};

#[inline]
pub fn transfer_tokens<'info>(
    source: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    seeds:&[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: source,
        to: destination,
        authority: authority
    };

    token::transfer(
        CpiContext::new_with_signer(
            token_program, 
            cpi_accounts, 
            seeds
        ),
        amount,
    )?;

    Ok(())
}

#[inline]
pub fn close_token_account<'info>(
    account: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = CloseAccount {
        account,
        destination,
        authority,
    };

    token::close_account(
        CpiContext::new_with_signer(
            token_program,
            cpi_accounts,
            seeds
        ),
    )?;

    Ok(())
}

/// Check whether or not two sorted arrays of keys are distinct
pub fn is_sorted_distinct(slice_1:&[Pubkey], slice_2:&[Pubkey])->Option<bool>{

    if !slice_1.is_sorted_by(|key_1, key_2| key_1.lt(key_2)) || 
        !slice_2.is_sorted_by(|key_1, key_2| key_1.lt(key_2)){
        return None;
    }

    let mut slice_1_iter = slice_1.iter();
    let mut slice_2_iter = slice_2.iter();

    let mut maybe_key_1 = slice_1_iter.next();
    let mut maybe_key_2 = slice_2_iter.next();

    while let (Some(key_1), Some(key_2)) = (maybe_key_1, maybe_key_2) {
        match key_1.cmp(key_2) {
            std::cmp::Ordering::Less => maybe_key_1 = slice_1_iter.next(),
            std::cmp::Ordering::Equal => return Some(false),
            std::cmp::Ordering::Greater => maybe_key_2 = slice_2_iter.next(),
        }
    }

    Some(true)
}