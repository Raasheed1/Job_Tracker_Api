from marshmallow import Schema, fields, validate


class ApplicationStatusSchema(Schema):
    status = fields.String(
        required=True,
        validate=validate.OneOf(['pending', 'selected', 'rejected'])
    )
