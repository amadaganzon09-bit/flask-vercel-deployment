from flask import Blueprint
from controllers import account_controller
from utils.decorators import token_required

account_bp = Blueprint('account', __name__)

account_bp.route('/accounts', methods=['POST'])(token_required(account_controller.create_account))
account_bp.route('/accounts', methods=['GET'])(token_required(account_controller.get_accounts))
account_bp.route('/accounts/<id>', methods=['PUT'])(token_required(account_controller.update_account))
account_bp.route('/accounts/<id>', methods=['DELETE'])(token_required(account_controller.delete_account))
