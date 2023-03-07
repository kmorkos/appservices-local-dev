import { BSON, MongoClient } from 'mongodb';
import createDoggo from './dist/createDoggo.js';
import getDoggo from './dist/getDoggo.js';

describe('functions', () => {
  let mc: MongoClient;
  beforeAll(() => {
    mc = new MongoClient('mongodb://localhost:27017');
  });

  afterAll(() => {
    mc.close();
  });

  it('createDoggo', async () => {
    const uniqueName = new BSON.ObjectId();
    await createDoggo(uniqueName, 'Chihuahua', 1);

    const dog = await mc.db('db').collection('Dog').findOne({ name: uniqueName });
    expect(dog).toEqual({
      _id: dog?._id,
      age: 1,
      name: uniqueName,
      breed: 'Chihuahua',
    });
  });

  it('getDoggo', async () => {
    const uniqueName = new BSON.ObjectId();

    const expectedDog = { _id: new BSON.ObjectId(), name: uniqueName, breed: 'Siberian Husky', age: 2 };
    await mc.db('db').collection('Dog').insertOne(expectedDog);

    const res = await getDoggo(uniqueName);
    expect(res.error).toBeUndefined();
    expect(res.result).toEqual(expectedDog);
  });
});
