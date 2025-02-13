// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "./Blacklistable.sol";

contract MyToken2_AE is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ERC20Permit, ERC2771Context, Blacklistable {
    constructor(address initialOwner, address trustedForwarder, string memory _object)
        ERC20(_object, _object)
        Ownable(initialOwner)
        ERC20Permit(_object)
        ERC2771Context(trustedForwarder)
    {}

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
        notBlacklisted(from)
        notBlacklisted(to)
    {
        super._update(from, to, value);
    }

    function _msgSender() internal view virtual override(Context, ERC2771Context) returns (address) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view virtual override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view virtual override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }

    function mint(address to, uint256 amount) 
        public 
        onlyOwner 
        notBlacklisted(msg.sender) 
        notBlacklisted(to) 
    {
        _mint(to, amount);
    }

    /**
     * @dev Only the owner of the contract can burn
     */
    function burn(uint256 value) 
        public 
        virtual 
        override 
        onlyOwner 
        notBlacklisted(msg.sender)
    {
        super.burn(value);
    }

    function burnFrom(address account, uint256 value) 
        public 
        virtual 
        override 
        onlyOwner 
        notBlacklisted(msg.sender)
    {
        super.burnFrom(account, value);
    }

    function transfer(address to, uint256 value) 
        public 
        virtual 
        override
        notBlacklisted(msg.sender)
        notBlacklisted(to)
        returns (bool) 
    {
        return super.transfer(to, value);
    }

    function approve(address spender, uint256 value) 
        public 
        virtual 
        override 
        notBlacklisted(msg.sender) 
        notBlacklisted(spender) 
        whenNotPaused
        returns (bool) 
    {
        return super.approve(spender, value);
    }

    function transferFrom(address from, address to, uint256 value) 
        public 
        virtual 
        override 
        notBlacklisted(msg.sender)
        notBlacklisted(from)
        notBlacklisted(to)
        returns (bool)
    {
        return super.transferFrom(from, to, value);
    } 

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) 
        public 
        virtual 
        override
        notBlacklisted(owner)
        notBlacklisted(spender)
    {
        super.permit(owner, spender, value, deadline, v, r, s);
    }

    /**
     * @inheritdoc Blacklistable
     */
    function _blacklist(address _account) internal override {
        _setBlacklistState(_account, true);
    }

    /**
     * @inheritdoc Blacklistable
     */
    function _unBlacklist(address _account) internal override {
        _setBlacklistState(_account, false);
    }

    /**
     * @dev Helper method that sets the blacklist state of an account.
     * @param _account         The address of the account.
     * @param _shouldBlacklist True if the account should be blacklisted, false if the account should be unblacklisted.
     */
    function _setBlacklistState(address _account, bool _shouldBlacklist)
        internal
        virtual
    {
        _deprecatedBlacklisted[_account] = _shouldBlacklist;
    }

    /**
     * @inheritdoc Blacklistable
     */
    function _isBlacklisted(address _account)
        internal
        virtual
        override
        view
        returns (bool)
    {
        return _deprecatedBlacklisted[_account];
    }
}