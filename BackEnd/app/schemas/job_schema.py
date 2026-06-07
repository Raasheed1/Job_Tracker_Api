from marshmallow import Schema, fields, validate

class JobSchema(Schema):
    company = fields.String(required=True)
    role = fields.String(required=True)
    status = fields.String(validate=validate.OneOf(["applied", "interview", "offer", "rejected"]))
    notes = fields.String(load_default=None)
    job_url = fields.Url(load_default=None)
    applied_date = fields.Date(load_default=None)