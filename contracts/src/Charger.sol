// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * Charger: 从已 approve 的用户地址扣 ERC20 到 treasury。
 * 仅白名单 operator 可调用 charge；owner 拥有治理权限（treasury、operator、限额、暂停、转移 owner）。
 */
contract Charger is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable token;
    address public treasury;
    uint256 public maxSingleCharge;

    mapping(address => bool) public operators;

    event Charged(address indexed user, uint256 amount, bytes32 ref, address indexed operator);
    event TreasurySet(address indexed previousTreasury, address indexed newTreasury);
    event OperatorSet(address indexed operator, bool status);
    event MaxSingleChargeSet(uint256 previousMax, uint256 newMax);

    error ZeroAddress();
    error ZeroAmount();
    error ExceedsMaxSingleCharge();
    error NotOperator();
    error TransferFailed();

    constructor(
        address _token,
        address _treasury,
        uint256 _maxSingleCharge,
        address _owner
    ) Ownable(_owner) {
        if (_token == address(0) || _treasury == address(0) || _owner == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        treasury = _treasury;
        maxSingleCharge = _maxSingleCharge;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    // ---------- owner 治理 ----------

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address prev = treasury;
        treasury = _treasury;
        emit TreasurySet(prev, _treasury);
    }

    function setOperator(address op, bool status) external onlyOwner {
        if (op == address(0)) revert ZeroAddress();
        operators[op] = status;
        emit OperatorSet(op, status);
    }

    function setMaxSingleCharge(uint256 _maxSingleCharge) external onlyOwner {
        uint256 prev = maxSingleCharge;
        maxSingleCharge = _maxSingleCharge;
        emit MaxSingleChargeSet(prev, _maxSingleCharge);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------- operator 扣费 ----------

    /**
     * 从 user 扣 amount 到 treasury。调用前需 user 已 approve(this, amount)。
     */
    function charge(
        address user,
        uint256 amount,
        bytes32 ref
    ) external onlyOperator nonReentrant whenNotPaused {
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > maxSingleCharge) revert ExceedsMaxSingleCharge();

        bool ok = token.transferFrom(user, treasury, amount);
        if (!ok) revert TransferFailed();

        emit Charged(user, amount, ref, msg.sender);
    }
}
