import { get } from 'lodash'

const axios = require('axios')
const baseUrl = `${process.env.REACT_APP_API_HOST}`
const apiUrl = `${process.env.REACT_APP_API_HOST}`
const defaultOptions = {
  mode: 'cors',
}

const statusOK = status => status === 200 || status === 201 || status === 304

export default {
  faker: delay => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('faked!')
      }, delay)
    })
  },
  auth: async (resource, params) => {
    try {
      const res = await axios({
        method: 'POST',
        url: `${apiUrl}/auth/${resource}`,
        headers: {
          ...params.headers,
        },
        ...defaultOptions,
        ...params.options,
      })
      return res

      // if (statusOK(res.status)) {
      //     return res;
      // }
    } catch (e) {
      return Promise.reject(e)
    }
  },
  getDirect: async (url, params) => {
    try {
      const res = await axios({
        method: 'GET',
        url,
        headers: {
          ...params.headers,
        },
        ...defaultOptions,
        ...params.options,
      })

      if (statusOK(res.status)) {
        return res
      }
    } catch (e) {
      return Promise.reject(e)
    }
  },
  get: async (resource, params) => {
    try {
      const res = await axios({
        method: 'GET',
        url: `${baseUrl}/${resource}`,
        headers: {
          ...params.headers,
        },
        ...defaultOptions,
        ...params.options,
      })

      if (statusOK(res.status)) {
        return res
      }
    } catch (e) {
      return Promise.reject(e)
    }
  },
  speech: {
    getList: async (resource, params) => {
      /* resource argument only for definition */
      try {
        const res = await axios({
          method: 'GET',
          url: `${apiUrl}/speeches`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },

          ...defaultOptions,
          ...params,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    getAssignedList: async (resource, params) => {
      /* resource argument only for definition */
      try {
        const res = await axios({
          method: 'GET',
          url: `${apiUrl}/speeches/assigned`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },

          ...defaultOptions,
          ...params,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    get: async (resource, params) => {
      console.log({
        method: 'GET',
        url: `${apiUrl}/speeches/${params.id}/${resource}`,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          ...params.headers,
        },
        ...defaultOptions,
        ...params.options,
      })
      try {
        const res = await axios({
          method: 'GET',
          url: `${apiUrl}/speeches/${params.id}/${resource}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },
          ...defaultOptions,
          ...params.options,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    post: async (resource, params) => {
      console.log({
        method: 'POST',
        url: `${apiUrl}/speeches/${params.id}/${resource}`,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          ...params.headers,
        },
        ...defaultOptions,
        ...params.options,
      })
      try {
        const res = await axios({
          method: 'POST',
          url: `${apiUrl}/speeches/${params.id}/${resource}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },
          ...defaultOptions,
          ...params.options,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    delete: async (resource, params) => {
      // `${process.env.REACT_APP_API_HOST}/api/speech/${transcriptionId}` (ListTranscription.js) [MODIFY TO /delete]
      try {
        const res = await axios({
          method: 'DELETE',
          url: `${apiUrl}/speeches/${params.id}/${resource}`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },
          ...defaultOptions,
          ...params.options,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    create: async (resource, params) => {
      try {
        const res = await axios({
          method: 'POST',
          url:
            'id' in params
              ? `${apiUrl}/speeches/${params.id}`
              : `${apiUrl}/speeches`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },
          ...defaultOptions,
          ...params.options,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    reuploadTranscript: async (resource, params) => {
      try {
        const res = await axios({
          method: 'POST',
          url: `${apiUrl}/speeches/${params.id}/reupload`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },
          ...defaultOptions,
          ...params.options,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    completeAssignment: async (resource, params) => {
      try {
        const res = await axios({
          method: 'POST',
          url: `${apiUrl}/speeches/${params.id}/assign/complete`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },
          ...defaultOptions,
          ...params.options,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    correctTranscription: async (resource, params) => {
      try {
        const res = await axios({
          method: 'POST',
          url: `${apiUrl}/speeches/${params.id}/assign/correct`,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            ...params.headers,
          },
          ...defaultOptions,
          ...params.options,
        })

        if (statusOK(res.status)) {
          return res
        }
      } catch (e) {
        return Promise.reject(e)
      }
    },
    transcripts: {
      create: async (resource, params) => {
        try {
          const res = await axios({
            method: 'POST',
            url: `${apiUrl}/sentences/`,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              ...params.headers,
            },
            ...defaultOptions,
            ...params.options,
          })

          if (statusOK(res.status)) {
            return res
          }
        } catch (e) {
          return Promise.reject(e)
        }
      },
      update: async (resource, params) => {
        const sentenceId = get(params, 'options.data.sentenceId')
        try {
          const res = await axios({
            method: 'PATCH',
            url: `${apiUrl}/sentences/${sentenceId}/`,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              ...params.headers,
            },
            ...defaultOptions,
            ...params.options,
          })

          if (statusOK(res.status)) {
            return res
          }
        } catch (e) {
          return Promise.reject(e)
        }
      },
      // used to delete one sentence
      delete: async (resource, params) => {
        const sentenceId = get(params, 'options.data.sentenceId')
        if (sentenceId) {
          try {
            const res = await axios({
              method: 'DELETE',
              url: `${apiUrl}/sentences/${sentenceId}`,
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                ...params.headers,
              },
              ...defaultOptions,
            })

            if (statusOK(res.status)) {
              return res
            }
          } catch (e) {
            return Promise.reject(e)
          }
        } else {
          return Promise.reject('No sentence Id')
        }
      },
    },
  },
}
