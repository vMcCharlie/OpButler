// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOpButlerAdapter {
    /**
     * @notice Supply asset to the lending protocol
     * @param asset The underlying asset address
     * @param amount The amount to supply
     */
    function supply(address asset, uint256 amount) external;

    /**
     * @notice Borrow asset from the lending protocol
     * @param asset The underlying asset address
     * @param amount The amount to borrow
     */
    function borrow(address asset, uint256 amount) external;

    /**
     * @notice Repay borrowed asset to the lending protocol
     * @param asset The underlying asset address
     * @param amount The amount to repay
     */
    function repay(address asset, uint256 amount) external;

    /**
     * @notice Redeem supplied asset from the lending protocol
     * @param asset The underlying asset address
     * @param amount The amount to redeem
     */
    function redeem(address asset, uint256 amount) external;

    /**
     * @notice Get the debt balance of the user (proxy)
     * @param asset The underlying asset address
     */
    function getDebtBalance(address asset) external view returns (uint256);

    /**
     * @notice Get the supply balance of the user (proxy)
     * @param asset The underlying asset address
     */
    function getSupplyBalance(address asset) external view returns (uint256);
}
