import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def send_mail(to_email, subject, html_content, text_content):
    sender_email = "darielganzon2003@gmail.com"
    sender_password = "azfs mmtr jhxh tsyu" # Hardcoded as per original JS file
    
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f'"Leirad Noznag" <{sender_email}>'
    message["To"] = to_email

    part1 = MIMEText(text_content, "plain")
    part2 = MIMEText(html_content, "html")

    message.attach(part1)
    message.attach(part2)

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, message.as_string())
        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        raise e
