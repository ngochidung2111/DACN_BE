import { ApiResponse } from "./api-response.dto";

type ResponseParam<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export class ResponseBuilder<T> {
  static createResponse<T>({ statusCode = 200, message = 'success', data }: ResponseParam<T>) : ApiResponse<T> {
    return {
      statusCode,
      message,
      data,
    };
  }
}
