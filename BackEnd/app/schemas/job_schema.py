from marshmallow import Schema, fields, validate


class JobSchema(Schema):
    title = fields.String(required=True)
    company = fields.String(required=True)
    description = fields.String(required=True)
    location = fields.String(load_default=None)
    salary = fields.String(load_default=None)
    job_type = fields.String(
        load_default=None,
        validate=validate.OneOf(['full-time', 'part-time', 'contract', 'internship', 'remote'])
    )
    is_active = fields.Boolean(load_default=True)