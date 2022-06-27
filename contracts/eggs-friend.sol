//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC721A.sol";

contract EggsFriendNFT is Ownable, ERC721A {
    using ECDSA for bytes32;
    using Strings for uint256;

    address private payoutAddress;
    address public signerAddress;

    // metadata URI
    string private _baseTokenURI;

    uint256 public collectionSize;
    uint256 public maxBatchSize;
    uint256 public currentSaleIndex;

    enum SaleStage {
        Whitelist,
        Public
    }
    struct SaleConfig {
        uint32 startTime;
        uint32 endTime;
        uint64 price;
        SaleStage stage;
    }
    SaleConfig[] public saleConfigs;

    mapping(string => bool) public ticketUsed;

    constructor(address _signerAddress) ERC721A("Eggs friend", "EGG") {
        collectionSize = 3333;
        maxBatchSize = 1;
        payoutAddress = 0x4154464945Eb8ff6D739E12b1117d6b1C5D42D83;
        signerAddress = _signerAddress;
        currentSaleIndex = 0;
    }

    modifier checkMintConstraint(uint256 quantity) {
        require(tx.origin == msg.sender, "The caller is another contract");

        SaleConfig memory config = saleConfigs[currentSaleIndex];
        uint256 price = uint256(config.price);

        require(quantity <= maxBatchSize, "Exceed mint quantity limit.");
        require(
            totalSupply() + quantity <= collectionSize,
            "reached max supply"
        );
        require(msg.value >= price * quantity, "Need to send more ETH.");
        _;
    }

    function whitelistMint(
        uint256 quantity,
        string memory _ticket,
        bytes memory _signature
    ) external payable checkMintConstraint(quantity) {
        proceedSaleStageIfNeed();

        require(isSaleStageOn(SaleStage.Whitelist), "Sale has not started yet");

        require(!ticketUsed[_ticket], "Ticket has already been used");
        require(
            isAuthorized(msg.sender, _ticket, _signature, signerAddress),
            "Ticket is invalid"
        );

        ticketUsed[_ticket] = true;
        _safeMint(msg.sender, quantity);
    }

    function mint(uint256 quantity)
        external
        payable
        checkMintConstraint(quantity)
    {
        proceedSaleStageIfNeed();
        require(isSaleStageOn(SaleStage.Public), "sale has not started yet");

        _safeMint(msg.sender, quantity);
    }

    function proceedSaleStageIfNeed() private {
        while (saleConfigs.length > currentSaleIndex + 1) {
            SaleConfig memory config = saleConfigs[currentSaleIndex];
            uint256 nextStageSaleEndTime = uint256(config.endTime);

            if (block.timestamp >= nextStageSaleEndTime) {
                currentSaleIndex += 1;
            } else {
                return;
            }
        }
    }

    function isSaleStageOn(SaleStage _stage) private view returns (bool) {
        if (saleConfigs.length <= currentSaleIndex) {
            return false;
        }

        SaleConfig memory config = saleConfigs[currentSaleIndex];
        uint256 stagePrice = uint256(config.price);
        uint256 stageSaleStartTime = uint256(config.startTime);
        SaleStage currentStage = config.stage;

        return
            stagePrice != 0 &&
            currentStage == _stage &&
            block.timestamp >= stageSaleStartTime;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "URI query for nonexistent token");

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length != 0
                ? string(abi.encodePacked(baseURI, tokenId.toString()))
                : "";
    }

    function currentSaleConfig() external view returns (SaleConfig memory) {
        uint256 saleIndex = currentSaleIndex;

        while (saleConfigs.length > saleIndex + 1) {
            SaleConfig memory _config = saleConfigs[saleIndex];
            uint256 nextStageSaleEndTime = uint256(_config.endTime);

            if (block.timestamp >= nextStageSaleEndTime) {
                saleIndex += 1;
            } else {
                break;
            }
        }

        SaleConfig memory config = saleConfigs[saleIndex];
        return config;
    }

    function mintForAirdrop(address[] memory _to, uint256 _mintAmount)
        external
        onlyOwner
    {
        uint256 supply = totalSupply();
        require(
            supply + _to.length * _mintAmount <= collectionSize,
            "Exceed max supply"
        );

        for (uint256 i = 0; i < _to.length; i++) {
            _safeMint(_to[i], _mintAmount);
        }
    }

    function setSaleConfig(
        uint256 _saleIndex,
        uint32 _startTime,
        uint32 _endTime,
        uint64 _price,
        SaleStage _stage
    ) external onlyOwner {
        SaleConfig memory config = SaleConfig({
            startTime: _startTime,
            endTime: _endTime,
            price: _price,
            stage: _stage
        });

        if (_saleIndex >= saleConfigs.length) {
            saleConfigs.push(config);
        } else {
            saleConfigs[_saleIndex] = config;
        }
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(payoutAddress).call{
            value: address(this).balance
        }("");
        require(success, "Transfer failed.");
    }

    function numberMinted(address owner) public view returns (uint256) {
        return _numberMinted(owner);
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setCurrentSaleIndex(uint256 _currentSaleIndex) external onlyOwner {
        currentSaleIndex = _currentSaleIndex;
    }

    function setMaxBatchSize(uint256 _newMaxBatchSize) external onlyOwner {
        maxBatchSize = _newMaxBatchSize;
    }

    function setCollectionSize(uint256 _newCollectionSize) external onlyOwner {
        collectionSize = _newCollectionSize;
    }

    function isTicketAvailable(string memory ticket, bytes memory signature)
        external
        view
        returns (bool)
    {
        return
            !ticketUsed[ticket] &&
            isAuthorized(msg.sender, ticket, signature, signerAddress);
    }

    function isAuthorized(
        address sender,
        string memory ticket,
        bytes memory signature,
        address _signerAddress
    ) private pure returns (bool) {
        bytes32 hash = keccak256(abi.encodePacked(sender, ticket));
        bytes32 signedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        return _signerAddress == signedHash.recover(signature);
    }
}
