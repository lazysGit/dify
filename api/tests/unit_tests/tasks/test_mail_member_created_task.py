from unittest.mock import MagicMock, patch

from tasks.mail_member_created_task import send_member_created_mail_task


class TestSendMemberCreatedMailTask:
    @patch("tasks.mail_member_created_task.get_email_i18n_service")
    @patch("tasks.mail_member_created_task.mail")
    def test_mail_not_inited_skips_send(self, mock_mail, mock_email_svc):
        mock_mail.is_inited.return_value = False

        send_member_created_mail_task(
            language="en-US",
            to="user@example.com",
            member_name="Test User",
            workspace_name="Test WS",
            initial_password="Secret123",
        )

        mock_email_svc.assert_not_called()

    @patch("tasks.mail_member_created_task.get_email_i18n_service")
    @patch("tasks.mail_member_created_task.mail")
    def test_mail_inited_sends_raw_email(self, mock_mail, mock_email_svc):
        mock_mail.is_inited.return_value = True
        mock_sender = MagicMock()
        mock_email_svc.return_value = mock_sender

        send_member_created_mail_task(
            language="en-US",
            to="user@example.com",
            member_name="Test User",
            workspace_name="Test WS",
            initial_password="Secret123",
        )

        mock_sender.send_raw_email.assert_called_once()
        call_kwargs = mock_sender.send_raw_email.call_args[1]
        assert call_kwargs["to"] == "user@example.com"
        assert "Test WS" in call_kwargs["subject"]

    @patch("tasks.mail_member_created_task.get_email_i18n_service")
    @patch("tasks.mail_member_created_task.mail")
    def test_task_kwargs_do_not_log_password(self, mock_mail, mock_email_svc, caplog):
        import logging

        mock_mail.is_inited.return_value = True
        mock_sender = MagicMock()
        mock_email_svc.return_value = mock_sender

        with caplog.at_level(logging.INFO):
            send_member_created_mail_task(
                language="en-US",
                to="user@example.com",
                member_name="Test User",
                workspace_name="Test WS",
                initial_password="Secret123",
            )

        for record in caplog.records:
            assert "Secret123" not in record.getMessage()

        call_kwargs = mock_sender.send_raw_email.call_args[1]
        assert "Secret123" not in str(call_kwargs.get("subject", ""))
