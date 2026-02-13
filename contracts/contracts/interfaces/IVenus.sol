// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVenusComptroller {
    function enterMarkets(address[] calldata vTokens) external returns (uint[] memory);
    function exitMarket(address vToken) external returns (uint);
    function getAccountLiquidity(address account) external view returns (uint, uint, uint);
    function getAssetsIn(address account) external view returns (address[] memory);
    function markets(address vToken) external view returns (bool isListed, uint collateralFactorMantissa, bool isComped);
}

interface IVenusToken {
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function borrowBalanceCurrent(address account) external returns (uint);
    function borrowBalanceStored(address account) external view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
    function exchangeRateStored() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function decimals() external view returns (uint8);
    function underlying() external view returns (address);
}
