import { Tags } from '@aws-cdk/core';
// import { ITags } from './types'

// TODO: create interface ITags and set allowed environment values.
// type ITags = [key: 'managedBy',
//     value: 'cloudformation'][] |
//     [key: 'environment',
//         value: 'dev' | 'test' | 'prod'][]

const tagHelpers = {
    COMMON_TAGS: [
        ['managedBy', 'cloudformation'],
        ['environment', 'test']
    ],
    // TODO: create another object to add indevidual tags to indevidual resourses
    addCommanTagsToRecource: (resource: any) => {
        tagHelpers.COMMON_TAGS.forEach(tag => {
            const [key, value] = tag
            Tags.of(resource).add(key, value)
        });
    },

    addTagsToResource: (resource: any, TAGS: String[]) => {
        TAGS.forEach(tag => {
            const [key, value] = tag
            Tags.of(resource).add(key, value)
        });
    },

}

export default tagHelpers