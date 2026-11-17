import logging
import time

import click
from celery import shared_task

from extensions.ext_mail import mail
from libs.email_i18n import get_email_i18n_service

logger = logging.getLogger(__name__)


@shared_task(queue="mail")
def send_member_created_mail_task(
    language: str,
    to: str,
    member_name: str,
    workspace_name: str,
    initial_password: str,
):
    if not mail.is_inited():
        return

    logger.info(click.style(f"Start send member created mail to {to} in workspace {workspace_name}", fg="green"))
    start_at = time.perf_counter()

    try:
        html_content = (
            f"<p>Hello {member_name},</p>"
            f"<p>An account has been created for you in workspace <strong>{workspace_name}</strong>.</p>"
            f"<p>Your initial password is: <strong>{initial_password}</strong></p>"
            f"<p>Please change your password after first login.</p>"
        )

        email_service = get_email_i18n_service()
        email_service.send_raw_email(
            to=to,
            subject=f"Welcome to {workspace_name}",
            html_content=html_content,
        )

        end_at = time.perf_counter()
        logger.info(
            click.style(
                f"Send member created mail to {to} succeeded: latency: {end_at - start_at}",
                fg="green",
            )
        )
    except Exception:
        logger.exception("Send member created mail to %s failed", to)
