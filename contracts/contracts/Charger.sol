// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * Charger: 从已 approve 的地址扣 USDT 到 owner。
 * 仅 owner（或后续可扩展为 role）可调用 charge。
 */
contract Charger is Ownable, ReentrancyGuard {
    IERC20 public immutable token;

    event Charge(address indexed from, address indexed to, uint256 amount, bytes32 ref);

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Charger: zero token");
        token = IERC20(_token);
    }

    /**
     * 从 from 扣 amount 的 token 到 owner。
     * 调用前需确保 from 已 approve(this, amount) 或更大。
     */
    function charge(
        address from,
        uint256 amount,
        bytes32 ref
    ) external onlyOwner nonReentrant {
        require(from != address(0), "Charger: zero from");
        require(amount > 0, "Charger: zero amount");
        address to = owner();
        require(token.transferFrom(from, to, amount), "Charger: transfer failed");
        emit Charge(from, to, amount, ref);
    }

    /**
     * 批量扣费（可选，减少 gas）
     */
    function chargeBatch(
        address[] calldata froms,
        uint256[] calldata amounts,
        bytes32[] calldata refs
    ) external onlyOwner nonReentrant {
        require(
            froms.length == amounts.length && froms.length == refs.length,
            "Charger: length mismatch"
        );
        address to = owner();
        for (uint256 i = 0; i < froms.length; i++) {
            address from = froms[i];
            uint256 amount = amounts[i];
            if (from == address(0) || amount == 0) continue;
            require(token.transferFrom(from, to, amount), "Charger: transfer failed");
            emit Charge(from, to, amount, refs[i]);
        }
    }
}
