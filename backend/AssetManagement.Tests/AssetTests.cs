using AssetManagement.Domain.Entities;
using Xunit;

namespace AssetManagement.Tests
{
    public class AssetTests
    {
        [Fact]
        public void NewAsset_ShouldHaveAvailableStatusByDefault()
        {
            // Arrange
            var asset = new Asset();

            // Act & Assert
            Assert.Equal(AssetStatus.Available, asset.Status);
        }

        [Fact]
        public void NewAsset_CanAssignAssetTag()
        {
            // Arrange
            var asset = new Asset();
            var testTag = "QR-12345";

            // Act
            asset.AssetTag = testTag;

            // Assert
            Assert.Equal(testTag, asset.AssetTag);
        }
    }
}
