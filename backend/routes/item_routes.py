from flask import Blueprint
from controllers import item_controller
from utils.decorators import token_required

item_bp = Blueprint('item', __name__)

item_bp.route('/create', methods=['POST'])(token_required(item_controller.create_item))
item_bp.route('/read', methods=['GET'])(token_required(item_controller.read_items))
item_bp.route('/update', methods=['PUT'])(token_required(item_controller.update_item))
item_bp.route('/delete', methods=['DELETE'])(token_required(item_controller.delete_item))
