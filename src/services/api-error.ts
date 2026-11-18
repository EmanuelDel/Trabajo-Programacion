export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, any>

  constructor(status: number, code: string, message: string, details?: Record<string, any>) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}
