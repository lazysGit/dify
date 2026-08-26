from unittest.mock import Mock, patch

import pytest
from werkzeug.exceptions import Forbidden

from libs.workspace_permission import (
    check_workspace_owner_transfer_permission,
)


class TestWorkspacePermissionHelper:
    """Test workspace permission helper functions."""

    @patch("libs.workspace_permission.dify_config")
    @patch("libs.workspace_permission.FeatureService")
    def test_community_edition_allows_transfer(self, mock_feature_service, mock_config):
        """Community edition should check billing plan but not call enterprise service."""
        mock_config.ENTERPRISE_ENABLED = False
        mock_features = Mock()
        mock_features.is_allow_transfer_workspace = True
        mock_feature_service.get_features.return_value = mock_features

        # Should not raise
        check_workspace_owner_transfer_permission("test-workspace-id")

        mock_feature_service.get_features.assert_called_once_with("test-workspace-id")

    @patch("libs.workspace_permission.EnterpriseService")
    @patch("libs.workspace_permission.dify_config")
    @patch("libs.workspace_permission.FeatureService")
    def test_billing_plan_blocks_transfer(self, mock_feature_service, mock_config, mock_enterprise_service):
        """SANDBOX billing plan should block owner transfer before checking enterprise policy."""
        mock_config.ENTERPRISE_ENABLED = True
        mock_features = Mock()
        mock_features.is_allow_transfer_workspace = False  # SANDBOX plan
        mock_feature_service.get_features.return_value = mock_features

        with pytest.raises(Forbidden, match="Your current plan does not allow workspace ownership transfer"):
            check_workspace_owner_transfer_permission("test-workspace-id")

        # Enterprise service should NOT be called since billing plan already blocks
        mock_enterprise_service.WorkspacePermissionService.get_permission.assert_not_called()

    @patch("libs.workspace_permission.EnterpriseService")
    @patch("libs.workspace_permission.dify_config")
    @patch("libs.workspace_permission.FeatureService")
    def test_enterprise_blocks_transfer_when_disabled(self, mock_feature_service, mock_config, mock_enterprise_service):
        """Enterprise edition should block transfer when workspace policy is False."""
        mock_config.ENTERPRISE_ENABLED = True
        mock_features = Mock()
        mock_features.is_allow_transfer_workspace = True  # Billing plan allows
        mock_feature_service.get_features.return_value = mock_features

        mock_permission = Mock()
        mock_permission.allow_owner_transfer = False  # Workspace policy blocks
        mock_enterprise_service.WorkspacePermissionService.get_permission.return_value = mock_permission

        with pytest.raises(Forbidden, match="Workspace policy prohibits ownership transfer"):
            check_workspace_owner_transfer_permission("test-workspace-id")

        mock_enterprise_service.WorkspacePermissionService.get_permission.assert_called_once_with("test-workspace-id")

    @patch("libs.workspace_permission.EnterpriseService")
    @patch("libs.workspace_permission.dify_config")
    @patch("libs.workspace_permission.FeatureService")
    def test_enterprise_allows_transfer_when_both_enabled(
        self, mock_feature_service, mock_config, mock_enterprise_service
    ):
        """Enterprise edition should allow transfer when both billing and workspace policy allow."""
        mock_config.ENTERPRISE_ENABLED = True
        mock_features = Mock()
        mock_features.is_allow_transfer_workspace = True  # Billing plan allows
        mock_feature_service.get_features.return_value = mock_features

        mock_permission = Mock()
        mock_permission.allow_owner_transfer = True  # Workspace policy allows
        mock_enterprise_service.WorkspacePermissionService.get_permission.return_value = mock_permission

        # Should not raise
        check_workspace_owner_transfer_permission("test-workspace-id")

        mock_enterprise_service.WorkspacePermissionService.get_permission.assert_called_once_with("test-workspace-id")
